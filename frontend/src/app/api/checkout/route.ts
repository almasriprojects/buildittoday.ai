import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { HEADLINE, TIERS, byKey, money, type Tier, type TierKey } from "@/lib/pricing";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

/**
 * POST /api/checkout — one Stripe session that takes the setup fee and starts
 * the subscription.
 *
 * This used to run in one-time payment mode, so the setup fee was collected and
 * the monthly never was — while the homepage, the pricing page, the Terms and
 * all five outreach emails promised it. Subscription mode with the setup fee as
 * an additional line item charges both from a single card entry.
 */

/**
 * The recurring Price, found by lookup_key rather than an id in an environment
 * variable. Test and live accounts each have their own price ids but the same
 * lookup keys, so switching mode is only a matter of switching the API key.
 * Created by scripts/stripe-setup.mjs.
 */
async function monthlyPriceId(tier: Tier): Promise<string> {
  const key = `bit_${tier.key}_monthly`;
  const found = await stripe.prices.list({ lookup_keys: [key], active: true, limit: 1 });
  const price = found.data[0];
  if (!price) {
    throw new Error(
      `No active Stripe price for "${key}". Run: node scripts/stripe-setup.mjs`
    );
  }
  // Guard against the catalogue drifting from the site. Charging a different
  // amount from the one advertised is the worst possible bug here.
  if (price.unit_amount !== tier.monthly * 100) {
    throw new Error(
      `Stripe price ${price.id} is $${(price.unit_amount ?? 0) / 100}/mo but ${tier.name} advertises $${tier.monthly}/mo. Re-run scripts/stripe-setup.mjs`
    );
  }
  return price.id;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { businessName, email, demoSlug, tier } = body;

    if (!businessName || !email) {
      return NextResponse.json(
        { error: "Business name and email are required" },
        { status: 400 }
      );
    }

    // Never take the price from the client. The tier arrives as a key and the
    // amount is looked up here, so a tampered request cannot buy Professional
    // for a dollar.
    const chosen =
      typeof tier === "string" && TIERS.some((t) => t.key === tier)
        ? byKey(tier as TierKey)
        : HEADLINE;

    const recurring = await monthlyPriceId(chosen);
    const base = process.env.NEXT_PUBLIC_URL ?? "https://www.buildittoday.ai";

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer_email: email,
      line_items: [
        // The subscription. Billing starts today; the site is live within the
        // week, and the Terms allow cancelling at any time.
        { price: recurring, quantity: 1 },
        // The setup fee, charged once on this first invoice.
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: `${chosen.name} — setup for ${businessName}`,
              description:
                "One-time build and launch on your own domain. Charged once.",
              // General — Electronically Supplied Services. Managed Payments
              // is on by default and requires a tax code, and it rejects the
              // more specific "Website Design" code as ineligible; verified
              // against the live API rather than assumed. This one is both
              // accepted and accurate for a site built and delivered online.
              tax_code: "txcd_10000000",
            },
            unit_amount: chosen.setup * 100,
          },
          quantity: 1,
        },
      ],
      subscription_data: {
        metadata: {
          businessName,
          demoSlug: demoSlug ?? "",
          tier: chosen.key,
        },
      },
      success_url: `${base}/claim/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: demoSlug
        ? `${base}/claim?slug=${encodeURIComponent(demoSlug)}&tier=${chosen.key}&checkout=cancelled`
        : `${base}/claim?checkout=cancelled`,
      // demoSlug is what lets the webhook tie a payment back to the lead.
      // Without it a successful payment is an orphan.
      metadata: {
        businessName,
        demoSlug: demoSlug ?? "",
        email,
        tier: chosen.key,
        setup: String(chosen.setup),
        monthly: String(chosen.monthly),
      },
    });

    return NextResponse.json({ url: session.url, sessionId: session.id });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// GET - payment status for the success page.
export async function GET(request: NextRequest) {
  try {
    const sessionId = new URL(request.url).searchParams.get("sessionId");
    if (!sessionId) {
      return NextResponse.json({ error: "Session ID is required" }, { status: 400 });
    }

    const session = await stripe.checkout.sessions.retrieve(sessionId);
    const tierKey = session.metadata?.tier;
    const tier =
      tierKey && TIERS.some((t) => t.key === tierKey)
        ? byKey(tierKey as TierKey)
        : null;

    return NextResponse.json({
      sessionId: session.id,
      status: session.payment_status,
      amountPaid: session.amount_total ? session.amount_total / 100 : null,
      currency: session.currency,
      tier: tier ? { name: tier.name, monthly: money(tier.monthly) } : null,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
