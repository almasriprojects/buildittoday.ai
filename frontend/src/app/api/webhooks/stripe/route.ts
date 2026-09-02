import { NextRequest, NextResponse } from "next/server";
import type Stripe from "stripe";
import { createServiceRoleClient } from "@/lib/supabase";
import { sendWelcome } from "@/lib/customer-email";
import { alert } from "@/lib/telegram";
import { getSecrets, stripeClient } from "@/lib/secrets";

// Stripe needs the raw body to verify the signature, so this route must not
// let Next parse it first.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";


/**
 * Stripe moved `current_period_end` off the subscription and onto its items,
 * and replaced `invoice.subscription` with `invoice.parent.subscription_details`.
 * These read whichever shape the account's API version returns, so an SDK bump
 * cannot quietly start writing nulls into billing dates.
 */
function periodEnd(sub: Stripe.Subscription): string | null {
  const item = sub.items?.data?.[0] as { current_period_end?: number } | undefined;
  const ts =
    item?.current_period_end ??
    (sub as unknown as { current_period_end?: number }).current_period_end;
  return ts ? new Date(ts * 1000).toISOString() : null;
}

function invoiceSubscriptionId(inv: Stripe.Invoice): string | null {
  const v = inv as unknown as {
    parent?: { subscription_details?: { subscription?: string | { id: string } } };
    subscription?: string | { id: string };
  };
  const s = v.parent?.subscription_details?.subscription ?? v.subscription;
  if (!s) return null;
  return typeof s === "string" ? s : s.id;
}

export async function POST(request: NextRequest) {
  const { stripe } = await stripeClient();
  const { stripeWebhookSecret: secret } = await getSecrets();
  if (!secret) {
    return NextResponse.json(
      { error: "No Stripe webhook secret configured — set one in Integrations." },
      { status: 500 }
    );
  }

  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "Missing stripe-signature" }, { status: 400 });
  }

  const rawBody = await request.text();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, secret);
  } catch (err) {
    // Never trust an unverified payload — this is the whole point of the secret.
    return NextResponse.json(
      { error: `Signature verification failed: ${err instanceof Error ? err.message : "unknown"}` },
      { status: 400 }
    );
  }

  const supabaseEarly = createServiceRoleClient();

  // Billing state lives in Stripe; these keep our copy honest afterwards.
  // Without them a cancelled or failed subscription would still read "active".
  if (
    event.type === "customer.subscription.updated" ||
    event.type === "customer.subscription.deleted"
  ) {
    const sub = event.data.object as Stripe.Subscription;
    await supabaseEarly
      .from("customers")
      .update({
        subscription_status: sub.status,
        cancel_at_period_end: sub.cancel_at_period_end ?? false,
        current_period_end: periodEnd(sub),
        ...(sub.status === "canceled" ? { onboarding_state: "cancelled" } : {}),
      })
      .eq("stripe_subscription_id", sub.id);
    return NextResponse.json({ received: true, handled: event.type });
  }

  if (event.type === "invoice.payment_failed") {
    const inv = event.data.object as Stripe.Invoice;
    const subId = invoiceSubscriptionId(inv);
    if (subId) {
      await supabaseEarly
        .from("customers")
        .update({ subscription_status: "past_due" })
        .eq("stripe_subscription_id", subId);
    }
    return NextResponse.json({ received: true, handled: event.type });
  }

  if (event.type !== "checkout.session.completed") {
    return NextResponse.json({ received: true, ignored: event.type });
  }

  const session = event.data.object as Stripe.Checkout.Session;
  // Subscription checkouts report payment_status "paid" once the first invoice
  // clears. Anything else means no money moved.
  if (session.payment_status !== "paid") {
    return NextResponse.json({ received: true, ignored: "not paid" });
  }

  const demoSlug = session.metadata?.demoSlug || null;
  const businessName = session.metadata?.businessName || null;
  const email = session.customer_email || session.metadata?.email || null;
  const amount = session.amount_total ? session.amount_total / 100 : null;

  const supabase = createServiceRoleClient();

  try {
    let leadId: string | null = null;
    let lead: {
      id: string;
      contact_phone: string | null;
      city: string | null;
      state: string | null;
      street_address: string | null;
      zip: string | null;
      business_category: string | null;
    } | null = null;

    if (demoSlug) {
      const { data } = await supabase
        .from("leads")
        .select(
          "id, contact_phone, city, state, street_address, zip, business_category"
        )
        .eq("demo_slug", demoSlug)
        .maybeSingle();
      lead = data ?? null;
      leadId = data?.id ?? null;
    }

    const paidAt = new Date().toISOString();

    if (leadId) {
      await supabase
        .from("leads")
        .update({ converted_at: paidAt, contact_status: "customer" })
        .eq("id", leadId);

      await supabase
        .from("potential_customers")
        .update({ status: "paid", converted_at: paidAt })
        .eq("lead_id", leadId);

      await supabase.from("outreach_events").insert({
        lead_id: leadId,
        channel: "web",
        event_type: "paid",
      });
    }

    // The subscription is the source of truth for billing state — read it back
    // rather than assuming "active", which is what this used to write on the
    // strength of a setup fee alone.
    const subId =
      typeof session.subscription === "string" ? session.subscription : null;
    let sub: Stripe.Subscription | null = null;
    if (subId) {
      try {
        sub = await stripe.subscriptions.retrieve(subId);
      } catch {
        // A missing subscription must not lose the payment record.
      }
    }

    const tier = session.metadata?.tier ?? null;
    const setup = Number(session.metadata?.setup ?? 0) || null;
    const monthly = Number(session.metadata?.monthly ?? 0) || null;

    // Their site keeps the readable address rather than the retired one.
    let publicSlug: string | null = null;
    if (demoSlug) {
      const { data: site } = await supabase
        .from("demo_sites").select("public_slug").eq("demo_slug", demoSlug).maybeSingle();
      publicSlug = site?.public_slug ?? null;
    }

    // Upsert on the subscription id so a Stripe retry cannot create a second
    // customer for one payment.
    const { error: customerError } = await supabase.from("customers").upsert(
      {
        business_name: businessName ?? "Unknown business",
        email: email ?? "unknown@unknown.invalid",
        phone: lead?.contact_phone ?? null,
        industry: lead?.business_category ?? null,
        address_street: lead?.street_address ?? null,
        address_city: lead?.city ?? null,
        address_state: lead?.state ?? "FL",
        address_zip: lead?.zip ?? null,
        demo_slug: demoSlug,
        demo_url: publicSlug ? `/${publicSlug}` : null,
        tier,
        setup_paid_cents: setup ? setup * 100 : null,
        monthly_cents: monthly ? monthly * 100 : null,
        stripe_customer_id:
          typeof session.customer === "string" ? session.customer : null,
        stripe_subscription_id: subId,
        subscription_status: sub?.status ?? "incomplete",
        cancel_at_period_end: sub?.cancel_at_period_end ?? false,
        current_period_end: sub ? periodEnd(sub) : null,
        hosting_status: "pending",
        onboarding_state: "awaiting_details",
        lead_id: leadId,
      },
      { onConflict: "stripe_subscription_id" }
    );
    if (customerError) throw new Error(`customers upsert: ${customerError.message}`);

    // Tell them immediately. A charge followed by silence is how a sale turns
    // into a chargeback, and this is the only message that stops the customer
    // wondering whether the payment worked.
    //
    // Deliberately after the upsert and deliberately not fatal: if Resend is
    // having a bad minute, the payment record must still stand. sendWelcome is
    // idempotent, so a Stripe retry cannot send it twice.
    try {
      const { data: saved } = await supabase
        .from("customers")
        .select("id")
        .eq("stripe_subscription_id", subId ?? "")
        .maybeSingle();
      if (saved?.id) await sendWelcome(saved.id);

      // The one notification worth interrupting anything for.
      await alert(
        "payment",
        `${businessName ?? "Someone"} just paid`,
        `${tier ?? "unknown tier"} · $${(amount ?? 0).toLocaleString()} · ${email ?? "no email"}`
      ).catch(() => {});
    } catch {
      // Swallowed on purpose — see above.
    }

    return NextResponse.json({ received: true, leadId, amount, tier, subscription: subId });
  } catch (err) {
    // Return 500 so Stripe retries — losing a payment record is worse than a retry.
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to record payment" },
      { status: 500 }
    );
  }
}
