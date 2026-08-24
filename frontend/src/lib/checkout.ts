import Stripe from "stripe";
import { type Tier } from "@/lib/pricing";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

/**
 * Building a Stripe Checkout session, in one place.
 *
 * Two callers: a plain link from a package button on the customer's own site,
 * and the claim form. The link path deliberately collects nothing first — the
 * business name is already known from the lead, and Stripe asks for the email
 * along with the card, so an intermediate form would be asking twice for the
 * same thing and losing people in between.
 */
export async function createCheckoutSession(args: {
  tier: Tier;
  businessName: string;
  demoSlug: string | null;
  /** Known only when the claim form was used; otherwise Stripe collects it. */
  email?: string | null;
}): Promise<Stripe.Checkout.Session> {
  const { tier, businessName, demoSlug, email } = args;

  const recurring = await monthlyPriceId(tier);
  const base = process.env.NEXT_PUBLIC_URL ?? "https://www.buildittoday.ai";

  return stripe.checkout.sessions.create({
    mode: "subscription",
    ...(email ? { customer_email: email } : {}),
    line_items: [
      { price: recurring, quantity: 1 },
      {
        price_data: {
          currency: "usd",
          product_data: {
            name: `${tier.name} — setup for ${businessName}`,
            description: "One-time build and launch on your own domain. Charged once.",
            // General — Electronically Supplied Services. Managed Payments is on
            // by default and requires a tax code; it rejects the more specific
            // "Website Design" code as ineligible, verified against the API
            // rather than assumed.
            tax_code: "txcd_10000000",
          },
          unit_amount: tier.setup * 100,
        },
        quantity: 1,
      },
    ],
    subscription_data: {
      metadata: { businessName, demoSlug: demoSlug ?? "", tier: tier.key },
    },
    success_url: `${base}/claim/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: demoSlug
      ? `${base}/claim?slug=${encodeURIComponent(demoSlug)}&tier=${tier.key}&checkout=cancelled`
      : `${base}/claim?checkout=cancelled`,
    // demoSlug is what lets the webhook tie a payment back to the lead.
    // Without it a successful payment is an orphan.
    metadata: {
      businessName,
      demoSlug: demoSlug ?? "",
      email: email ?? "",
      tier: tier.key,
      setup: String(tier.setup),
      monthly: String(tier.monthly),
    },
  });
}

/**
 * The recurring Price, found by lookup_key rather than an id in an environment
 * variable, so switching test to live is only a change of API key. Created by
 * scripts/stripe-setup.mjs.
 */
async function monthlyPriceId(tier: Tier): Promise<string> {
  const key = `bit_${tier.key}_monthly`;
  const found = await stripe.prices.list({ lookup_keys: [key], active: true, limit: 1 });
  const price = found.data[0];
  if (!price) {
    throw new Error(`No active Stripe price for "${key}". Run: node scripts/stripe-setup.mjs`);
  }
  // Charging a different amount from the one advertised is the worst bug
  // available here, so a mismatch stops the sale rather than completing it.
  if (price.unit_amount !== tier.monthly * 100) {
    throw new Error(
      `Stripe price ${price.id} is $${(price.unit_amount ?? 0) / 100}/mo but ${tier.name} advertises $${tier.monthly}/mo. Re-run scripts/stripe-setup.mjs`
    );
  }
  return price.id;
}
