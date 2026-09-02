import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase";
import { requireAdmin } from "@/lib/admin-auth";
import { formatDigest, sendTelegram, telegramConfigured } from "@/lib/telegram";
import { getEmailSettings } from "@/lib/email";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

/**
 * The morning report.
 *
 * One message covering where the business actually is: what came in, what went
 * out, what it earned, and the single most useful thing about today. Built to
 * be read on a phone in ten seconds, which is the only way a daily report
 * survives past week two.
 */
async function build() {
  const supabase = createServiceRoleClient();
  const settings = await getEmailSettings();

  const now = new Date();
  const midnight = new Date(now.toDateString()).toISOString();
  const yesterday = new Date(Date.now() - 864e5);
  const yStart = new Date(yesterday.toDateString()).toISOString();

  // Written out rather than abstracted. A helper here needed enough type
  // gymnastics to obscure what was being counted, which is the opposite of
  // useful in the one place that reports the state of the business.
  const count = async (q: PromiseLike<{ count: number | null }>) => (await q).count ?? 0;
  const head = { count: "exact" as const, head: true };

  const [
    leadsTotal, leadsNew, qualified, reachable,
    sitesBuilt, approved, pendingReview,
    sentYesterday, sentToday,
    customers,
  ] = await Promise.all([
    count(supabase.from("leads").select("*", head)),
    count(supabase.from("leads").select("*", head).gte("created_at", midnight)),
    count(supabase.from("leads").select("*", head).eq("target_fit", "yes")),
    count(supabase.from("leads").select("*", head).not("contact_email", "is", null)),
    count(supabase.from("demo_sites").select("*", head).eq("status", "ready")),
    count(supabase.from("demo_sites").select("*", head).eq("review_status", "approved")),
    count(supabase.from("demo_sites").select("*", head).eq("review_status", "pending")),
    count(supabase.from("email_sends").select("*", head).gte("sent_at", yStart).lt("sent_at", midnight)),
    count(supabase.from("email_sends").select("*", head).gte("sent_at", midnight)),
    count(supabase.from("customers").select("*", head)),
  ]);

  // Engagement over the last seven days — a single day is too noisy to read.
  const weekAgo = new Date(Date.now() - 7 * 864e5).toISOString();
  const { data: events } = await supabase
    .from("outreach_events")
    .select("event_type")
    .gte("occurred_at", weekAgo);

  const ev = events ?? [];
  const countOf = (p: string) => ev.filter((e) => e.event_type.startsWith(p)).length;

  // Money, read from what was actually recorded rather than assumed.
  const { data: paying } = await supabase
    .from("customers")
    .select("monthly_cents, setup_paid_cents, onboarding_state")
    .in("subscription_status", ["active", "trialing", "past_due"]);

  const mrrCents = (paying ?? []).reduce((s, c) => s + (c.monthly_cents ?? 0), 0);
  const setupCents = (paying ?? []).reduce((s, c) => s + (c.setup_paid_cents ?? 0), 0);

  const { data: queue } = await supabase
    .from("lead_email_state")
    .select("next_send_at, status")
    .in("status", ["active", "clicked"]);
  const dueNow = (queue ?? []).filter(
    (q) => q.next_send_at && q.next_send_at <= now.toISOString()
  ).length;

  const waitingOnYou = (paying ?? []).filter((c) =>
    ["in_build", "awaiting_domain"].includes(c.onboarding_state ?? "")
  ).length;

  // Paid, but no welcome email recorded — the state that quietly loses a
  // customer. Computed from the send log rather than guessed.
  const { data: welcomed } = await supabase
    .from("customer_emails").select("customer_id").eq("kind", "welcome").is("error", null);
  const welcomedIds = new Set((welcomed ?? []).map((w) => w.customer_id));
  const neverContacted = (paying ?? []).length
    ? (await supabase.from("customers").select("id")).data
        ?.filter((c) => !welcomedIds.has(c.id)).length ?? 0
    : 0;

  // What stands between today and revenue. Stated plainly, because a digest
  // that only shows numbers lets a blocker sit unnoticed for a week.
  const blockers: string[] = [];
  if (!settings.postal_address) blockers.push("No postal address — no email can legally be sent");
  if (!settings.sending_enabled) blockers.push("Sending is switched off");
  if (settings.test_mode) blockers.push("Test mode on — nothing reaches a real business");
  if (approved === 0) blockers.push("No approved sites — nothing can enter the sequence");
  if (!process.env.STRIPE_WEBHOOK_SECRET) blockers.push("Stripe webhook unset — a payment would be recorded nowhere");
  if (!process.env.RESEND_WEBHOOK_SECRET) blockers.push("Resend webhook unset — bounces go unrecorded");

  // Forecast, kept honest about small numbers rather than inventing precision.
  const remaining = Math.max(0, settings.daily_cap - sentToday);
  const willSend = settings.sending_enabled && !blockers.length ? Math.min(remaining, dueNow) : 0;
  const clicks7 = countOf("clicked");
  const sends7 = await count(
    supabase.from("email_sends").select("*", head).gte("sent_at", weekAgo)
  );
  const rate = sends7 > 0 ? clicks7 / sends7 : 0;

  let forecast: string;
  if (willSend === 0) {
    forecast = blockers.length
      ? "Nothing will send — see blocked, below."
      : dueNow === 0
      ? "Nothing due in the queue."
      : "Daily cap already reached.";
  } else if (sends7 < 20) {
    forecast = `${willSend} email${willSend > 1 ? "s" : ""} will send. Too early to forecast clicks from ${sends7} sends.`;
  } else {
    forecast = `${willSend} email${willSend > 1 ? "s" : ""} will send · ~${(willSend * rate).toFixed(1)} clicks at the last 7 days' rate (${(rate * 100).toFixed(0)}%).`;
  }

  return formatDigest({
    date: now.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" }),
    leads: { total: leadsTotal, newToday: leadsNew, qualified, reachable },
    sites: { built: sitesBuilt, approved, pendingReview },
    email: {
      sentYesterday, sentToday, dueNow,
      dailyCap: settings.daily_cap,
      sendingOn: settings.sending_enabled,
      testMode: settings.test_mode,
    },
    funnel: {
      clicks: clicks7,
      views: countOf("viewed"),
      offersShown: countOf("offer_shown"),
      offersClicked: countOf("offer_clicked"),
    },
    money: { customers, mrrCents, setupCents },
    waiting: { onYou: waitingOnYou, neverContacted },
    blockers,
    forecast,
  });
}

export async function POST(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const presented = request.headers.get("x-cron-secret");
  if (!(secret && presented && presented === secret)) {
    const gate = await requireAdmin();
    if (!gate.ok) return gate.response;
  }

  try {
    const text = await build();
    if (!(await telegramConfigured())) {
      return NextResponse.json({ sent: false, reason: "Telegram not configured", preview: text });
    }
    // Silent: this arrives every morning and should not buzz. Alerts do.
    const res = await sendTelegram(text, { silent: true });
    return res.ok
      ? NextResponse.json({ sent: true })
      : NextResponse.json({ sent: false, error: res.error, preview: text }, { status: 502 });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Digest failed" },
      { status: 500 }
    );
  }
}

/** GET — see exactly what would be sent, without sending it. */
export async function GET() {
  const gate = await requireAdmin();
  if (!gate.ok) return gate.response;
  const text = await build();
  return NextResponse.json({ configured: await telegramConfigured(), preview: text });
}
