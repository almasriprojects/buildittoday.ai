import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase";

export const dynamic = "force-dynamic";

async function unsubscribe(leadId: string) {
  const supabase = createServiceRoleClient();
  const now = new Date().toISOString();

  const { data: lead } = await supabase
    .from("leads")
    .select("id, contact_email")
    .eq("id", leadId)
    .maybeSingle();
  if (!lead) return false;

  await supabase.from("leads").update({ unsubscribed_at: now }).eq("id", lead.id);

  // Suppress by address, not just by lead: the same person can appear again
  // under a different business, and an opt-out has to survive that.
  if (lead.contact_email) {
    await supabase
      .from("email_suppressions")
      .upsert({ email: lead.contact_email.toLowerCase(), reason: "unsubscribed" });
  }

  await supabase
    .from("lead_email_state")
    .upsert({ lead_id: lead.id, status: "unsubscribed", next_send_at: null, updated_at: now });

  await supabase.from("outreach_events").insert({
    lead_id: lead.id, channel: "email", event_type: "unsubscribed",
  });

  return true;
}

// GET — the link in the footer. One click, no confirmation step: making
// someone work to leave produces spam complaints, which are far more damaging.
export async function GET(request: NextRequest) {
  const leadId = new URL(request.url).searchParams.get("lead");
  if (leadId) await unsubscribe(leadId);

  return new NextResponse(
    `<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
     <title>Unsubscribed</title>
     <div style="font-family:system-ui,-apple-system,sans-serif;max-width:32rem;margin:18vh auto;padding:0 1.5rem;text-align:center;color:#171717">
       <h1 style="font-size:1.5rem;font-weight:600;margin:0 0 .75rem">You're unsubscribed</h1>
       <p style="color:#666;line-height:1.6;margin:0">You won't receive any more emails from us. No further action needed.</p>
     </div>`,
    { status: 200, headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" } }
  );
}

// POST — RFC 8058 one-click unsubscribe, used by Gmail and Apple Mail.
export async function POST(request: NextRequest) {
  const leadId = new URL(request.url).searchParams.get("lead");
  if (leadId) await unsubscribe(leadId);
  return new NextResponse(null, { status: 200 });
}
