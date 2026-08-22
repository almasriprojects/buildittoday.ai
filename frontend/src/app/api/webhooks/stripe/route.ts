import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { createServiceRoleClient } from "@/lib/supabase";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

// Stripe needs the raw body to verify the signature, so this route must not
// let Next parse it first.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) {
    return NextResponse.json(
      { error: "STRIPE_WEBHOOK_SECRET is not configured" },
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

  if (event.type !== "checkout.session.completed") {
    return NextResponse.json({ received: true, ignored: event.type });
  }

  const session = event.data.object as Stripe.Checkout.Session;
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

    // Column names here must match the real customers table:
    // subscription_status / hosting_status, not "status". email is NOT NULL.
    const { error: customerError } = await supabase.from("customers").insert({
      business_name: businessName ?? "Unknown business",
      email: email ?? "unknown@unknown.invalid",
      phone: lead?.contact_phone ?? null,
      industry: lead?.business_category ?? null,
      address_street: lead?.street_address ?? null,
      address_city: lead?.city ?? null,
      address_state: lead?.state ?? "FL",
      address_zip: lead?.zip ?? null,
      demo_url: demoSlug ? `/demo-sites/${demoSlug}` : null,
      subscription_status: "active",
      hosting_status: "pending",
      lead_id: leadId,
    });
    if (customerError) throw new Error(`customers insert: ${customerError.message}`);

    return NextResponse.json({ received: true, leadId, amount });
  } catch (err) {
    // Return 500 so Stripe retries — losing a payment record is worse than a retry.
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to record payment" },
      { status: 500 }
    );
  }
}
