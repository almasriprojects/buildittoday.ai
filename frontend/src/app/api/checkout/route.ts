import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { HEADLINE, TIERS, byKey, money, type TierKey } from "@/lib/pricing";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

// POST - Create Stripe checkout session
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { businessName, email, demoSlug, tier } = body;

    // Never take the price from the client. The tier is a key; the amount is
    // looked up here, so a tampered request cannot buy Professional for $1.
    const chosen =
      typeof tier === "string" && TIERS.some((t) => t.key === tier)
        ? byKey(tier as TierKey)
        : HEADLINE;

    if (!businessName || !email) {
      return NextResponse.json(
        { error: "Business name and email are required" },
        { status: 400 }
      );
    }

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      customer_email: email,
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: `${chosen.name} Website — ${businessName}`,
              description: `One-time setup. Site built, launched on your domain. ${money(chosen.monthly)}/month hosting starts after launch.`,
            },
            // Derived rather than typed, so the amount charged can never drift
            // from the price advertised on the claim page. Stripe wants cents.
            unit_amount: chosen.setup * 100,
          },
          quantity: 1,
        },
      ],
      success_url: `${process.env.NEXT_PUBLIC_URL}/claim/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: demoSlug
        ? `${process.env.NEXT_PUBLIC_URL}/claim?slug=${encodeURIComponent(demoSlug)}&checkout=cancelled`
        : `${process.env.NEXT_PUBLIC_URL}/claim?checkout=cancelled`,
      // demoSlug is what lets the webhook tie a payment back to the lead.
      // Without it a successful payment is an orphan.
      metadata: { businessName, demoSlug: demoSlug ?? "", email, tier: chosen.key },
    });

    return NextResponse.json({ url: session.url, sessionId: session.id });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

// GET - Get payment status
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get("sessionId");

    if (!sessionId) {
      return NextResponse.json(
        { error: "Session ID is required" },
        { status: 400 }
      );
    }

    const session = await stripe.checkout.sessions.retrieve(sessionId);

    return NextResponse.json({
      sessionId: session.id,
      status: session.payment_status,
      amountPaid: session.amount_total ? session.amount_total / 100 : null,
      currency: session.currency,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
