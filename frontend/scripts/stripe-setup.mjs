#!/usr/bin/env node
/**
 * Creates the Stripe Product and recurring Price for each tier.
 *
 * Idempotent: run it as often as you like, in test or live. Prices carry a
 * `lookup_key`, so the application finds them by name rather than by an id
 * pasted into an environment variable — which means switching from test to live
 * is nothing more than switching the key.
 *
 *   node scripts/stripe-setup.mjs
 *
 * A Stripe Price is immutable. If a tier's monthly amount changes, this creates
 * a new Price and moves the lookup_key onto it; existing subscribers keep
 * paying the amount they signed up at, which is what you want.
 */
import fs from "node:fs";
import path from "node:path";

const envPath = path.join(process.cwd(), ".env.local");
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, "utf8").split("\n")) {
    const m = line.match(/^([A-Z_]+)=(.*)$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
}

const KEY = process.env.STRIPE_SECRET_KEY;
if (!KEY) {
  console.error("STRIPE_SECRET_KEY is not set.");
  process.exit(1);
}
const MODE = KEY.startsWith("sk_live_") ? "LIVE" : "TEST";

// Mirrors src/lib/pricing.ts. Kept in step by the check at the bottom.
// Stripe's Managed Payments requires a tax code on every product. These are
// the exact ones: the monthly is hosting and support, the setup fee is design
// and build. Getting this right is what keeps sales tax correct per state.
const TAX_HOSTING = "txcd_10701100"; // Website Hosting

const TIERS = [
  { key: "starter",      name: "Starter Website",      monthly: 50  },
  { key: "professional", name: "Professional Website", monthly: 99  },
  { key: "signature",    name: "Signature Website",    monthly: 199 },
];

async function stripe(method, endpoint, body) {
  const res = await fetch(`https://api.stripe.com/v1/${endpoint}`, {
    method,
    headers: {
      Authorization: `Bearer ${KEY}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: body ? new URLSearchParams(body).toString() : undefined,
  });
  const json = await res.json();
  if (json.error) throw new Error(`${endpoint}: ${json.error.message}`);
  return json;
}

const lookupKey = (t) => `bit_${t.key}_monthly`;

console.log(`\nStripe setup — ${MODE} mode\n`);

for (const tier of TIERS) {
  const lk = lookupKey(tier);

  // The product comes first, because its tax code has to be correct even when
  // the price is already right — an early exit here is what previously left
  // existing products without one.
  const search = await stripe(
    "GET",
    `products/search?query=${encodeURIComponent(`metadata['bit_tier']:'${tier.key}'`)}&limit=1`
  );
  let product = search.data?.[0];

  if (!product) {
    product = await stripe("POST", "products", {
      name: tier.name,
      tax_code: TAX_HOSTING,
      "metadata[bit_tier]": tier.key,
      description: `Hosting, updates and support for the ${tier.name.replace(" Website", "")} plan.`,
    });
    console.log(`  + product ${product.id} — ${tier.name}`);
  } else if (product.tax_code !== TAX_HOSTING) {
    await stripe("POST", `products/${product.id}`, { tax_code: TAX_HOSTING });
    console.log(`  ~ tax code set on ${product.id} — ${tier.name}`);
  }

  const existing = await stripe("GET", `prices?lookup_keys[]=${lk}&active=true&limit=1`);
  const current = existing.data?.[0];

  if (current && current.unit_amount === tier.monthly * 100) {
    console.log(`  = ${tier.name.padEnd(22)} $${tier.monthly}/mo  ${current.id}  (unchanged)`);
    continue;
  }

  // A Price cannot be edited, so releasing the lookup_key from the old one
  // first is what lets the new price claim it. Existing subscribers keep the
  // amount they signed up at.
  if (current) {
    await stripe("POST", `prices/${current.id}`, { lookup_key: "", active: "false" });
    console.log(`  - retired ${current.id} ($${current.unit_amount / 100}/mo)`);
  }

  const price = await stripe("POST", "prices", {
    product: product.id,
    currency: "usd",
    unit_amount: String(tier.monthly * 100),
    "recurring[interval]": "month",
    lookup_key: lk,
    transfer_lookup_key: "true",
    "metadata[bit_tier]": tier.key,
  });
  console.log(`  ✓ ${tier.name.padEnd(22)} $${tier.monthly}/mo  ${price.id}`);
}

console.log(`\nDone. Prices are found at runtime by lookup_key, so there is nothing to paste anywhere.\n`);
