import { createServiceRoleClient } from "@/lib/supabase";
import { sendTransactional } from "@/lib/email";

/**
 * Florida annual report reminders.
 *
 * Every Florida LLC and corporation must file an annual report between 1
 * January and 1 May. Miss it and the state adds a $400 late fee — automatic, no
 * grace period, and it surprises new owners every year.
 *
 * We already hold the document number and filing date for every lead, which
 * carries across to the customer record. So this costs nothing to run and saves
 * a customer $400, which is a far better answer to "what am I paying $99 a
 * month for" than hosting is.
 *
 * Deliberately reminders only. Filing on someone's behalf means handling their
 * money and submitting a state document as them; that needs written
 * authorisation and a plan for failed filings, and is a separate product.
 */

const SITE = process.env.NEXT_PUBLIC_URL ?? "https://www.buildittoday.ai";
const SUNBIZ = "https://services.sunbiz.org/Filings/AnnualReport";

/** Fee figures are shown as "about" because the state can change them. */
const LATE_FEE = "$400";

export type Milestone = "feb" | "mar" | "apr" | "final";

/** Which reminder is due today, if any. Nothing fires outside the window. */
export function milestoneFor(today = new Date()): Milestone | null {
  const m = today.getUTCMonth() + 1;
  const d = today.getUTCDate();
  if (m === 2 && d === 1) return "feb";
  if (m === 3 && d === 1) return "mar";
  if (m === 4 && d === 1) return "apr";
  if (m === 4 && d === 20) return "final";
  return null;
}

const COPY: Record<Milestone, { subject: (b: string) => string; urgency: string }> = {
  feb: {
    subject: (b) => `${b} — annual report is open`,
    urgency: "Filing opened on 1 January and closes on 1 May. Plenty of time, but it is the sort of thing that gets forgotten until it is expensive.",
  },
  mar: {
    subject: (b) => `${b} — two months to file`,
    urgency: "You have until 1 May. Most people do this in about ten minutes.",
  },
  apr: {
    subject: (b) => `${b} — one month left to file`,
    urgency: "The deadline is 1 May. After that the state adds a late fee automatically, and there is no appealing it.",
  },
  final: {
    subject: (b) => `${b} — 11 days until the ${LATE_FEE} late fee`,
    urgency: `The deadline is 1 May. Miss it and Florida adds ${LATE_FEE} to your filing — automatically, with no grace period and no way to have it waived.`,
  },
};

function body(args: {
  business: string;
  docNumber: string | null;
  milestone: Milestone;
  year: number;
}) {
  const { business, docNumber, milestone, year } = args;
  return `Hi,

A reminder that ${business} needs to file its ${year} Florida annual report.

${COPY[milestone].urgency}

  File it here: ${SUNBIZ}${docNumber ? `
  Your document number: ${docNumber}` : ""}

The state fee is around $138.75 for an LLC. We don't charge anything for this
reminder and we don't file it for you — it is your filing and it is quick.

Already done it? Let us know and we'll stop reminding you:
  ${SITE}/account

Anan
BuildItToday.ai
(305) 505-0153 · contact@buildittoday.ai`;
}

/**
 * Send today's reminder to every active customer who has not marked this year
 * as filed. Safe to run more than once a day — the log prevents a repeat.
 */
export async function runAnnualReportReminders(opts: { dryRun?: boolean } = {}) {
  const supabase = createServiceRoleClient();
  const today = new Date();
  const milestone = milestoneFor(today);
  const year = today.getUTCFullYear();

  if (!milestone) {
    return { ran: false, reason: "No reminder is due today.", sent: 0, milestone: null };
  }

  const { data: customers } = await supabase
    .from("customers")
    .select("id, business_name, email, lead_id, subscription_status, onboarding_state")
    .in("subscription_status", ["active", "trialing", "past_due"])
    .neq("onboarding_state", "cancelled");

  const rows = customers ?? [];
  if (!rows.length) return { ran: true, sent: 0, milestone, skipped: 0 };

  // Already reminded at this milestone, or already told us they filed.
  const { data: log } = await supabase
    .from("annual_report_reminders")
    .select("customer_id, milestone, filed")
    .eq("year", year);

  const done = new Set(
    (log ?? []).filter((r) => r.milestone === milestone).map((r) => r.customer_id)
  );
  const filed = new Set((log ?? []).filter((r) => r.filed).map((r) => r.customer_id));

  let sent = 0;
  let skipped = 0;
  const failures: string[] = [];

  for (const c of rows) {
    if (!c.email || done.has(c.id) || filed.has(c.id)) { skipped++; continue; }

    // The filing number lives on the lead this customer came from.
    let docNumber: string | null = null;
    if (c.lead_id) {
      const { data: lead } = await supabase
        .from("leads").select("document_number").eq("id", c.lead_id).maybeSingle();
      docNumber = lead?.document_number ?? null;
    }

    if (opts.dryRun) { sent++; continue; }

    const res = await sendTransactional({
      to: c.email,
      subject: COPY[milestone].subject(c.business_name),
      text: body({ business: c.business_name, docNumber, milestone, year }),
    });

    await supabase.from("annual_report_reminders").insert({
      customer_id: c.id, year, milestone,
      error: res.ok ? null : res.error,
    });

    if (res.ok) sent++;
    else failures.push(`${c.business_name}: ${res.error}`);
  }

  return { ran: true, milestone, year, sent, skipped, failures };
}
