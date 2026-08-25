import { createServiceRoleClient } from "@/lib/supabase";
import { sendTransactional } from "@/lib/email";
import { TIERS, money } from "@/lib/pricing";

/**
 * The emails a paying customer receives.
 *
 * Separate from the outreach templates on purpose. Those are marketing: stored
 * in the database so they can be reworded without a deploy, carrying an
 * unsubscribe footer, and subject to test mode. These are transactional — a
 * receipt, a request for details, a launch notice. Nobody opts out of being
 * told their site is live, and none of them may ever be redirected away from
 * the customer by a testing switch.
 *
 * Every send is recorded so the same message cannot go twice on a webhook
 * retry, and so support can see what a customer has actually received.
 */

const SITE = process.env.NEXT_PUBLIC_URL ?? "https://www.buildittoday.ai";
const PHONE = "(305) 505-0153";
const CONTACT = "contact@buildittoday.ai";

type Kind = "welcome" | "details_reminder" | "site_live";

type Customer = {
  id: string;
  business_name: string;
  email: string;
  tier: string | null;
  setup_paid_cents: number | null;
  monthly_cents: number | null;
  domain: string | null;
  demo_url: string | null;
};

async function alreadySent(customerId: string, kind: Kind): Promise<boolean> {
  const supabase = createServiceRoleClient();
  const { count } = await supabase
    .from("customer_emails")
    .select("*", { count: "exact", head: true })
    .eq("customer_id", customerId)
    .eq("kind", kind);
  return (count ?? 0) > 0;
}

async function record(customerId: string, kind: Kind, ok: boolean, error?: string) {
  const supabase = createServiceRoleClient();
  await supabase.from("customer_emails").insert({
    customer_id: customerId,
    kind,
    error: ok ? null : error ?? "unknown",
  });
}

async function load(customerId: string): Promise<Customer | null> {
  const supabase = createServiceRoleClient();
  const { data } = await supabase
    .from("customers")
    .select("id, business_name, email, tier, setup_paid_cents, monthly_cents, domain, demo_url")
    .eq("id", customerId)
    .maybeSingle();
  return (data as Customer) ?? null;
}

const signOff = `Anan
BuildItToday.ai
${PHONE} · ${CONTACT}`;

/**
 * Sent the moment payment clears. The single most important email in the
 * system: a charge followed by silence is how a sale becomes a chargeback, and
 * it is the difference between a customer who waits a week and one who calls
 * their bank on day two.
 */
export async function sendWelcome(customerId: string) {
  if (await alreadySent(customerId, "welcome")) return { ok: true, skipped: true };

  const c = await load(customerId);
  if (!c?.email) return { ok: false, error: "no customer or email" };

  const tier = TIERS.find((t) => t.key === c.tier);
  const paid = c.setup_paid_cents ? money(c.setup_paid_cents / 100) : null;
  const monthly = c.monthly_cents ? money(c.monthly_cents / 100) : null;

  const res = await sendTransactional({
    to: c.email,
    subject: `You're all set — ${c.business_name}`,
    text: `Thanks for that. Your payment went through and your site is now ours to finish.

What you bought
${tier ? `  ${tier.name}` : "  Website"}${paid ? `
  ${paid} today` : ""}${monthly ? `
  ${monthly}/month starting now — cancel any time` : ""}

What happens next
  1. Tell us your domain and anything you want changed:
     ${SITE}/account
     Sign in with this email address — no password needed.

  2. We build it. Usually within a week of getting your details.

  3. We point your domain at it, set up SSL, and email you when it's live.

The only thing holding this up is step 1, so it's worth two minutes now.

If anything is wrong, or you've changed your mind, reply to this email or call
me on ${PHONE}. There's no contract and nothing is locked in.

${signOff}`,
  });

  await record(customerId, "welcome", res.ok, res.ok ? undefined : res.error);
  return res;
}

/** A nudge for someone who paid and then went quiet. Sent once, never twice. */
export async function sendDetailsReminder(customerId: string) {
  if (await alreadySent(customerId, "details_reminder")) return { ok: true, skipped: true };

  const c = await load(customerId);
  if (!c?.email) return { ok: false, error: "no customer or email" };

  const res = await sendTransactional({
    to: c.email,
    subject: `Still need your domain — ${c.business_name}`,
    text: `Hi,

Your site for ${c.business_name} is paid for and waiting on one thing: the
domain you want it on, plus anything you'd like changed.

  ${SITE}/account

Two minutes and we can start building. If you don't have a domain yet, say so
on that page and we'll help you pick one — it's usually about $12 a year.

Anything at all in the way, just reply or call ${PHONE}.

${signOff}`,
  });

  await record(customerId, "details_reminder", res.ok, res.ok ? undefined : res.error);
  return res;
}

/** The end of the delivery promise. */
export async function sendSiteLive(customerId: string) {
  if (await alreadySent(customerId, "site_live")) return { ok: true, skipped: true };

  const c = await load(customerId);
  if (!c?.email) return { ok: false, error: "no customer or email" };

  const where = c.domain ? `https://${c.domain}` : c.demo_url ? `${SITE}${c.demo_url}` : SITE;

  const res = await sendTransactional({
    to: c.email,
    subject: `${c.business_name} is live`,
    text: `It's up:

  ${where}

Have a look on your phone as well as your computer — that's where most of your
customers will see it.

Want something changed? Content edits are included in your plan. Reply to this
email with whatever you want different and we'll do it. You don't need to be
polite about it or explain why.

You can see your plan and details any time at ${SITE}/account.

Thanks for trusting us with it.

${signOff}`,
  });

  await record(customerId, "site_live", res.ok, res.ok ? undefined : res.error);
  return res;
}
