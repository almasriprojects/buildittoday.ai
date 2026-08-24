/**
 * Every price the business quotes, in one place.
 *
 * These numbers were previously hardcoded in thirteen files — the page title,
 * the hero, the footer, the claim page, the FAQ, the Stripe checkout and the
 * outreach templates among them. A price change meant editing all thirteen, and
 * missing one meant a customer reading two different prices on the way to
 * paying. Import from here instead of typing a number.
 */

export type TierKey = "starter" | "professional" | "signature";

export type Tier = {
  key: TierKey;
  name: string;
  /** Setup fee in whole dollars. */
  setup: number;
  /** Recurring fee in whole dollars per month. */
  monthly: number;
  tagline: string;
  features: string[];
  /** The one the other two exist to sell. */
  popular?: boolean;
  cta: string;
  href?: string;
  /**
   * What pressing the button does.
   *
   * "checkout" goes straight to Stripe — no intermediate form, because the
   * business name is already known and Stripe collects the email itself.
   * "call" books a conversation instead, which is the honest handling for a
   * price nobody pays on impulse from a cold email.
   */
  action: "checkout" | "call";
};

export const TIERS: Tier[] = [
  {
    key: "starter",
    name: "Starter",
    setup: 750,
    monthly: 50,
    tagline:
      "A clean one-page site built around your business and live on your own domain in a week. Your photos, your words, no template.",
    features: [
      "Custom one-page design, not a template",
      "Services, about, and contact in one place",
      "Built from photos you already have",
      "Fast and mobile-first, not mobile-tolerant",
      "Your own domain, SSL, and hosting configured",
      "Cancel any time — no contract",
    ],
    cta: "Start here",
    action: "checkout",
  },
  {
    key: "professional",
    name: "Professional",
    setup: 1500,
    monthly: 99,
    // The tier the outreach emails quote. Its price must not move without the
    // templates moving with it — a lead who is quoted $1,500 and then finds a
    // different number here has been given a reason to distrust the offer.
    tagline:
      "Everything in Starter, plus the video hero and original imagery we shoot for you — the version most businesses should buy.",
    features: [
      "Everything in Starter",
      "Custom video hero, made for your business",
      "Original imagery — no stock photography",
      "Up to five pages",
      "Online booking or quote requests",
      "Google Business setup and local SEO",
      "Content edits included",
    ],
    popular: true,
    cta: "Claim your site",
    action: "checkout",
  },
  {
    key: "signature",
    name: "Signature",
    setup: 3500,
    monthly: 199,
    tagline:
      "The full treatment: every craft on this page, written copy, and changes whenever you need them without a new invoice.",
    features: [
      "Everything in Professional",
      "Professionally written copy",
      "Multi-page site with the full design treatment",
      "3D and premium assets when you want them",
      "Unlimited changes",
      "Monthly performance report",
      "Priority support",
    ],
    cta: "Book a call",
    href: "/#book",
    action: "call",
  },
];

export const byKey = (k: TierKey): Tier => {
  const t = TIERS.find((x) => x.key === k);
  if (!t) throw new Error(`Unknown pricing tier: ${k}`);
  return t;
};

/** The tier every headline, title and outreach email quotes. */
export const HEADLINE = byKey("professional");
/** The cheapest way in, for "from $X" copy. */
export const ENTRY = byKey("starter");

/** $1,500 — for prose. */
export function money(n: number): string {
  return `$${n.toLocaleString("en-US")}`;
}

/** Separate retainers, unrelated to the build tiers. */
export const GROWTH_FROM = 2000;
export const AUTOMATIONS_FROM = 2500;
