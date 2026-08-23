import { createServiceRoleClient } from "@/lib/supabase";
import {
  buildVars, getEmailSettings, renderTemplate, sendEmail, withFooter,
  type EmailSettings, type LeadForEmail,
} from "@/lib/email";

/**
 * The outreach sequence, advanced one run at a time.
 *
 * Called on a schedule. Everything it needs to decide is in the database, so a
 * missed run costs nothing — the next one picks up whatever is due.
 */

/** Days to wait after sending step N before step N+1 becomes due. */
const GAP_DAYS: Record<number, number | null> = { 1: 3, 2: 5, 3: 6, 4: null };

/** How long after the final email the demo is actually taken down. */
export const EXPIRY_DAYS = 3;

/**
 * Sending the whole daily allowance in one run looks like a blast. Spreading it
 * across hourly runs looks like a person working through a list, which is both
 * truer and much kinder to a young sending domain.
 */
const MAX_PER_RUN = 3;

export type SequenceResult = {
  ran: boolean;
  reason?: string;
  enrolled: number;
  sent: { leadId: string; business: string; step: number; slug: string }[];
  failed: { leadId: string; error: string }[];
  sentToday: number;
  dailyCap: number;
};

/** Which template a lead gets next, or null when the sequence is finished. */
function templateFor(step: number, clicked: boolean): string | null {
  switch (step) {
    case 1: return "outreach_1_intro";
    case 2: return "outreach_2_resend";
    // Someone who has opened the demo doesn't need the "what's the catch"
    // objection handled — they need to be asked what stopped them.
    case 3: return clicked ? "outreach_3b_warm" : "outreach_3_objection";
    case 4: return "outreach_4_expiry";
    default: return null;
  }
}

export async function runSequence(): Promise<SequenceResult> {
  const supabase = createServiceRoleClient();
  const settings: EmailSettings = await getEmailSettings();

  // Enrolment happens first and unconditionally. It sends nothing — it only
  // builds the queue — so it must not sit behind the sending guard, or the
  // queue reads empty right up until the moment mail starts going out. Filling
  // it early is what lets the list be inspected before the switch is thrown.
  const enrolled = await enrolNewLeads(supabase);

  const empty = { sent: [], failed: [], dailyCap: settings.daily_cap };

  // The same two guards the manual send route applies. A scheduled job must
  // never be a way around them.
  if (!settings.sending_enabled) {
    return { ran: false, reason: "Sending is switched off.", sentToday: 0, enrolled, ...empty };
  }
  if (!settings.postal_address) {
    return {
      ran: false, reason: "No postal address on file (CAN-SPAM).",
      sentToday: 0, enrolled, ...empty,
    };
  }

  const midnight = new Date(new Date().toDateString()).toISOString();
  const { count: sentToday } = await supabase
    .from("email_sends")
    .select("*", { count: "exact", head: true })
    .gte("sent_at", midnight)
    .is("error", null);

  const used = sentToday ?? 0;
  const budget = Math.min(settings.daily_cap - used, MAX_PER_RUN);
  if (budget <= 0) {
    return {
      ran: true, reason: `Daily cap reached (${used}/${settings.daily_cap}).`,
      sentToday: used, enrolled, ...empty,
    };
  }

  // Due, oldest first, so nobody waits behind a later arrival.
  const { data: due } = await supabase
    .from("lead_email_state")
    .select("lead_id, sequence_step, status")
    .lte("next_send_at", new Date().toISOString())
    .in("status", ["active", "clicked"])
    .order("next_send_at", { ascending: true })
    .limit(budget * 4); // over-fetch: some will be filtered out below

  const result: SequenceResult = {
    ran: true, enrolled, sent: [], failed: [],
    sentToday: used, dailyCap: settings.daily_cap,
  };
  if (!due?.length) return result;

  for (const state of due) {
    if (result.sent.length >= budget) break;

    const step = state.sequence_step + 1;
    const clicked = state.status === "clicked";
    const slug = templateFor(step, clicked);
    if (!slug) {
      await stop(supabase, state.lead_id, "completed");
      continue;
    }

    const outcome = await sendOne(supabase, settings, state.lead_id, slug, step, clicked);
    if (outcome.ok) {
      result.sent.push({
        leadId: state.lead_id, business: outcome.business, step, slug,
      });
    } else if (outcome.fatal) {
      await stop(supabase, state.lead_id, outcome.fatal);
    } else {
      result.failed.push({ leadId: state.lead_id, error: outcome.error });
    }
  }

  return result;
}

/**
 * Any lead whose demo has been approved and who can legally be emailed joins
 * the sequence. Approval is the human decision this whole pipeline waits on —
 * once it is given, nothing else should need a click.
 */
async function enrolNewLeads(
  supabase: ReturnType<typeof createServiceRoleClient>
): Promise<number> {
  const { data: approved } = await supabase
    .from("demo_sites").select("demo_slug").eq("review_status", "approved");
  const slugs = (approved ?? []).map((d) => d.demo_slug).filter(Boolean);
  if (!slugs.length) return 0;

  const { data: leads } = await supabase
    .from("leads")
    .select("id")
    .in("demo_slug", slugs)
    .not("contact_email", "is", null)
    .is("unsubscribed_at", null)
    .is("email_bounced_at", null);
  if (!leads?.length) return 0;

  const { data: existing } = await supabase
    .from("lead_email_state")
    .select("lead_id")
    .in("lead_id", leads.map((l) => l.id));
  const known = new Set((existing ?? []).map((s) => s.lead_id));

  const fresh = leads.filter((l) => !known.has(l.id));
  if (!fresh.length) return 0;

  const now = new Date().toISOString();
  await supabase.from("lead_email_state").insert(
    fresh.map((l) => ({
      lead_id: l.id, sequence_step: 0, next_send_at: now,
      status: "active", updated_at: now,
    }))
  );
  return fresh.length;
}

type SendOutcome =
  | { ok: true; business: string }
  | { ok: false; error: string; fatal?: string };

async function sendOne(
  supabase: ReturnType<typeof createServiceRoleClient>,
  settings: EmailSettings,
  leadId: string,
  slug: string,
  step: number,
  clicked: boolean
): Promise<SendOutcome> {
  const [{ data: lead }, { data: template }] = await Promise.all([
    supabase
      .from("leads")
      .select("id, business_name, contact_full_name, contact_email, demo_slug, city, unsubscribed_at, email_bounced_at")
      .eq("id", leadId).maybeSingle(),
    supabase
      .from("email_templates")
      .select("slug, subject, body_text, sequence_step, active")
      .eq("slug", slug).maybeSingle(),
  ]);

  if (!lead) return { ok: false, error: "lead missing", fatal: "lead missing" };
  if (!template?.active) return { ok: false, error: `template ${slug} inactive` };
  if (!lead.contact_email) return { ok: false, error: "no email", fatal: "no email" };

  // Re-checked at send time, not just at selection time: a lead can unsubscribe
  // between the two, and that has to win.
  if (lead.unsubscribed_at) return { ok: false, error: "unsubscribed", fatal: "unsubscribed" };
  if (lead.email_bounced_at) return { ok: false, error: "bounced", fatal: "bounced" };

  const { data: sup } = await supabase
    .from("email_suppressions").select("reason")
    .eq("email", lead.contact_email.toLowerCase()).maybeSingle();
  if (sup) return { ok: false, error: sup.reason, fatal: sup.reason };

  const { data: site } = await supabase
    .from("demo_sites").select("review_status")
    .eq("demo_slug", lead.demo_slug ?? "").maybeSingle();
  if (site?.review_status !== "approved") {
    return { ok: false, error: "demo not approved", fatal: "demo not approved" };
  }

  const expiry = new Date(Date.now() + EXPIRY_DAYS * 864e5);
  const vars = buildVars(lead as LeadForEmail, settings, {
    expiryDate: expiry.toLocaleDateString("en-US", { month: "long", day: "numeric" }),
  });

  const subject = renderTemplate(template.subject, vars);
  const text = withFooter(renderTemplate(template.body_text, vars), settings, lead.id);

  const res = await sendEmail({
    to: lead.contact_email,
    subject, text,
    from: `${settings.from_name} <${settings.from_email}>`,
    replyTo: settings.reply_to,
    leadId: lead.id,
  });

  const now = new Date().toISOString();

  if (!res.ok) {
    await supabase.from("email_sends").insert({
      lead_id: lead.id, template_slug: slug, sequence_step: step,
      to_email: lead.contact_email, subject, error: res.error,
    });
    // Left due on purpose — a provider blip should be retried next run.
    return { ok: false, error: res.error };
  }

  await supabase.from("email_sends").insert({
    lead_id: lead.id, template_slug: slug, sequence_step: step,
    to_email: lead.contact_email, subject, provider_id: res.id,
  });
  await supabase.from("outreach_events").insert({
    lead_id: lead.id, channel: "email", event_type: "sent",
  });
  await supabase.from("leads").update({ outreach_sent_at: now }).eq("id", lead.id);

  const gap = GAP_DAYS[step] ?? null;
  await supabase.from("lead_email_state").update({
    sequence_step: step,
    next_send_at: gap ? new Date(Date.now() + gap * 864e5).toISOString() : null,
    // A lead who has clicked keeps that status while the sequence runs, so
    // step 3 stays on the warm branch. Once there is nothing left to send,
    // everyone lands on 'completed' regardless of how they got there.
    status: gap ? (clicked ? "clicked" : "active") : "completed",
    last_event_at: now,
    updated_at: now,
  }).eq("lead_id", lead.id);

  return { ok: true, business: lead.business_name };
}

async function stop(
  supabase: ReturnType<typeof createServiceRoleClient>,
  leadId: string,
  status: string
) {
  await supabase.from("lead_email_state").update({
    status, next_send_at: null, updated_at: new Date().toISOString(),
  }).eq("lead_id", leadId);
}
