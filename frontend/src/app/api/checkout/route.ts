import { NextRequest, NextResponse } from "next/server";
import { HEADLINE, TIERS, byKey, money, type TierKey } from "@/lib/pricing";
import { createCheckoutSession } from "@/lib/checkout";
import { stripeClient } from "@/lib/secrets";

/**
 * POST /api/checkout — checkout from the claim form, where an email was typed.
 *
 * The package buttons on a customer's own site use GET /api/checkout/start
 * instead, which needs no form at all. Both build the session through
 * lib/checkout so there is one definition of what is being sold.
 */
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
    // amount is looked up server-side, so a tampered request cannot buy
    // Professional for a dollar.
    const chosen =
      typeof tier === "string" && TIERS.some((t) => t.key === tier)
        ? byKey(tier as TierKey)
        : HEADLINE;

    if (chosen.action !== "checkout") {
      return NextResponse.json(
        { error: "This package is arranged on a call." },
        { status: 400 }
      );
    }

    const session = await createCheckoutSession({
      tier: chosen,
      businessName,
      demoSlug: demoSlug ?? null,
      email,
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

    const { stripe } = await stripeClient();
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
