import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase";

export const dynamic = "force-dynamic";

/**
 * POST /api/webhooks/email-reply — somebody wrote back.
 *
 * A reply is the strongest signal this funnel can produce and the only one the
 * system could never see. Views and clicks are recorded, bounces and spam
 * complaints arrive from Resend, but a human typing a sentence in answer went
 * to contact@buildittoday.ai and nowhere else. Across 49 outreach emails there
 * have been zero replies — a fact established only by reading the mailbox by
 * hand, which is not a monitoring strategy.
 *
 * Gmail cannot call a webhook itself, so a short Apps Script polls it every
 * five minutes and posts here. The script is the only moving part outside this
 * repository; everything it needs to know is the secret and this URL.
 *
 * The endpoint can halt an outreach sequence, so it is authenticated. An
 * unauthenticated version would let anyone who guessed the path switch off
 * mailing for any lead they named.
 */

type Body = {
  from?: string;
  subject?: string;
  snippet?: string;
  receivedAt?: string;
  messageId?: string;
};

/** Pull the bare address out of `Some Name <a@b.com>`. */
function addressOf(raw: string): string {
  const m = raw.match(/<([^>]+)>/);
  return (m ? m[1] : raw).trim().toLowerCase();
}

export async function POST(request: NextRequest) {
  const supabase = createServiceRoleClient();

  const { data: secrets } = await supabase
    .from("app_secrets")
    .select("reply_webhook_secret")
    .limit(1)
    .maybeSingle();

  const expected = secrets?.reply_webhook_secret ?? "";
  if (!expected) {
    return NextResponse.json({ error: "Reply secret not configured" }, { status: 503 });
  }
  if (request.headers.get("x-reply-secret") !== expected) {
    return NextResponse.json({ error: "Not authorised" }, { status: 401 });
  }

  let body: Body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const from = addressOf(String(body.from ?? ""));
  if (!from || !from.includes("@")) {
    return NextResponse.json({ error: "from is required" }, { status: 400 });
  }

  const subject = String(body.subject ?? "").slice(0, 300);
  const snippet = String(body.snippet ?? "").slice(0, 1000);

  // Match the sender to a lead. An address we never wrote to is not a reply —
  // it is ordinary mail, and recording it would put strangers in the funnel.
  const { data: lead } = await supabase
    .from("leads")
    .select("id, business_name, city, contact_phone, demo_slug")
    .ilike("contact_email", from)
    .maybeSingle();

  // Record that the poller reached us, matched or not.
  //
  // A script that has stopped running and a script running over an empty inbox
  // produce the same silence. That ambiguity is what let the Resend webhook sit
  // dead for nineteen days, so this one is visible from its first request.
  await supabase.from("webhook_attempts").insert({
    source: "gmail-reply",
    event_type: lead ? "reply" : "not-a-lead",
    accepted: true,
    reason: lead ? null : from,
  }).then(() => {}, () => {});

  if (!lead) {
    return NextResponse.json({ ok: true, matched: false, note: "sender is not a lead" });
  }

  const now = new Date().toISOString();

  // Deliberately not guarded against duplicates by message id: the script only
  // forwards mail it has not seen, and a second record of the same reply is a
  // far smaller problem than missing one.
  await supabase.from("outreach_events").insert({
    lead_id: lead.id,
    channel: "email",
    event_type: "replied",
  });

  await supabase
    .from("leads")
    .update({ contact_status: "replied", replied_at: now })
    .eq("id", lead.id);

  // Stop the automated chase. Somebody answering deserves a person, not
  // touch three of a sequence. 'stopped' rather than 'replied' because
  // lead_email_state.status is CHECK-constrained and does not permit the
  // latter — writing it would be silently rejected, which is a mistake this
  // project has made twice.
  //
  // Every live status, not just 'active'. A lead who had clicked sits at
  // 'clicked' and is still in the sequence — branched to the warm template —
  // so matching only 'active' left the most engaged people still being chased
  // after they had answered. Testing this on a real lead is the only reason it
  // was caught.
  await supabase
    .from("lead_email_state")
    .update({ status: "stopped", last_event_at: now, updated_at: now })
    .eq("lead_id", lead.id)
    .in("status", ["active", "clicked"]);

  try {
    const { alert } = await import("@/lib/telegram");
    await alert(
      "payment",
      `${lead.business_name ?? from} replied`,
      [
        [lead.city, from].filter(Boolean).join(" · "),
        subject ? `Subject: ${subject}` : "",
        snippet ? `\n"${snippet.slice(0, 400)}"` : "",
        lead.contact_phone ? `\nCall them: ${lead.contact_phone}` : "",
        `\nThe sequence has been stopped for them.`,
      ].filter(Boolean).join("\n"),
    );
  } catch {
    // A failed notification must never lose the record of the reply.
  }

  return NextResponse.json({ ok: true, matched: true, business: lead.business_name });
}
