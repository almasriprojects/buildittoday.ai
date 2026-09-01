import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { createServiceRoleClient } from "@/lib/supabase";
import { alert } from "@/lib/telegram";

export const dynamic = "force-dynamic";

/**
 * POST /api/webhooks/resend — delivery feedback from the provider.
 *
 * Without this, a dead address keeps receiving all four touches. Repeatedly
 * mailing addresses that bounce is the single fastest way to have a young
 * sending domain blacklisted, and the sender never finds out until the domain
 * is already burned. Bounces and spam complaints are the only signals that
 * reliably say "stop", so they have to be acted on the moment they arrive.
 */

/**
 * Svix signature verification, which is what Resend uses.
 *
 * Signed content is `id.timestamp.body`; the secret is base64 after its
 * `whsec_` prefix. The header may carry several space-separated versioned
 * signatures, and any one matching is a pass — that is how key rotation works.
 */
function verify(secret: string, headers: Headers, raw: string): boolean {
  const id = headers.get("svix-id");
  const ts = headers.get("svix-timestamp");
  const sigHeader = headers.get("svix-signature");
  if (!id || !ts || !sigHeader) return false;

  // Reject anything older than five minutes so a captured request cannot be
  // replayed back at us later.
  const age = Math.abs(Date.now() / 1000 - Number(ts));
  if (!Number.isFinite(age) || age > 300) return false;

  const key = Buffer.from(secret.replace(/^whsec_/, ""), "base64");
  const expected = crypto
    .createHmac("sha256", key)
    .update(`${id}.${ts}.${raw}`)
    .digest("base64");

  return sigHeader.split(" ").some((part) => {
    const sig = part.split(",")[1];
    if (!sig) return false;
    const a = Buffer.from(sig);
    const b = Buffer.from(expected);
    return a.length === b.length && crypto.timingSafeEqual(a, b);
  });
}

type ResendEvent = {
  type?: string;
  data?: { email_id?: string; to?: string[] | string; [k: string]: unknown };
};

export async function POST(request: NextRequest) {
  const raw = await request.text();

  const secret = process.env.RESEND_WEBHOOK_SECRET;
  if (!secret) {
    // Refuse rather than trust. An unauthenticated endpoint that can suppress
    // addresses is a way for anyone to switch off your outreach.
    return NextResponse.json({ error: "Webhook secret not configured" }, { status: 503 });
  }
  if (!verify(secret, request.headers, raw)) {
    return NextResponse.json({ error: "Bad signature" }, { status: 401 });
  }

  let event: ResendEvent;
  try {
    event = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const type = event.type ?? "unknown";
  const providerId = event.data?.email_id ?? null;
  const to = Array.isArray(event.data?.to) ? event.data?.to[0] : event.data?.to;

  const supabase = createServiceRoleClient();
  const now = new Date().toISOString();

  // Match the event back to the send it belongs to. intended_to matters here:
  // in test mode the message went to the operator, and it is the lead's real
  // address that the outcome should be attributed to — or, for a bounce,
  // explicitly not attributed to.
  const { data: send } = providerId
    ? await supabase
        .from("email_sends")
        .select("id, lead_id, was_test, intended_to")
        .eq("provider_id", providerId)
        .maybeSingle()
    : { data: null };

  await supabase.from("email_events").insert({
    provider_id: providerId,
    lead_id: send?.lead_id ?? null,
    event_type: type,
    email: typeof to === "string" ? to : null,
    payload: event as unknown as Record<string, unknown>,
  });

  const leadId = send?.lead_id ?? null;

  switch (type) {
    case "email.delivered":
      if (send) await supabase.from("email_sends").update({ delivered_at: now }).eq("id", send.id);
      break;

    case "email.opened":
      // Recorded but never branched on: Apple Mail pre-fetches tracking pixels,
      // so a large share of these are machines, not people.
      if (send) await supabase.from("email_sends").update({ opened_at: now }).eq("id", send.id);
      break;

    case "email.clicked":
      if (send) await supabase.from("email_sends").update({ clicked_at: now }).eq("id", send.id);
      break;

    case "email.bounced":
    case "email.complained": {
      const complaint = type === "email.complained";
      const reason = complaint ? "complained" : "bounced";

      if (send) {
        await supabase.from("email_sends").update(
          complaint ? { complained_at: now } : { bounced_at: now, bounce_reason: reason }
        ).eq("id", send.id);
      }

      // A bounce during a test rehearsal is the operator's own inbox failing,
      // not the lead's. Suppressing on that would quietly poison the real list
      // and switch off the very address everything replies to.
      if (send?.was_test) break;

      if (leadId) {
        await supabase.from("leads").update(
          complaint
            ? { email_bounced_at: now, unsubscribed_at: now }
            : { email_bounced_at: now }
        ).eq("id", leadId);

        // lead_email_state.status is CHECK-constrained; 'complained' is not one
        // of the permitted values, and writing it would fail the update and
        // leave the lead due — still being mailed after a spam complaint, which
        // is the worst possible outcome. A complaint is recorded as an opt-out.
        await supabase.from("lead_email_state").upsert({
          lead_id: leadId,
          status: complaint ? "unsubscribed" : "bounced",
          next_send_at: null,
          updated_at: now,
        });

        await supabase.from("outreach_events").insert({
          lead_id: leadId, channel: "email", event_type: reason,
        });
      }

      // A complaint is far more damaging than a bounce and is worth a louder
      // signal — spam reports are what actually kill a sending domain.
      await alert(
        complaint ? "complaint" : "bounce",
        complaint ? "Spam complaint" : "Email bounced",
        `${send?.intended_to ?? to ?? "unknown address"} — suppressed and removed from the sequence`
      ).catch(() => {});

      const address = send?.intended_to ?? (typeof to === "string" ? to : null);
      if (address) {
        await supabase.from("email_suppressions")
          .upsert({ email: address.toLowerCase(), reason });
      }
      break;
    }
  }

  return NextResponse.json({ ok: true, type, matched: Boolean(send) });
}
