import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase";

// GET /api/track/click?lead={id} — email link click tracking.
//
// A click is the only engagement signal worth trusting: Apple Mail Privacy
// Protection pre-fetches tracking pixels, so opens are inflated and unreliable.
// The sequence therefore branches here, not on opens.
//
// Tracking must never break the redirect — every failure path still sends the
// visitor to a page.

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const leadId = searchParams.get("lead");
  const channel = searchParams.get("channel") === "postcard" ? "postcard" : "email";
  const src = searchParams.get("src") ?? channel;

  let demoSlug: string | null = null;

  if (leadId) {
    try {
      const supabase = createServiceRoleClient();
      const now = new Date().toISOString();

      await supabase.from("outreach_events").insert({
        lead_id: leadId,
        channel,
        event_type: "clicked",
      });

      const { data } = await supabase
        .from("leads")
        .select("document_number, email_clicked_at")
        .eq("id", leadId)
        .maybeSingle();

      if (data?.document_number) {
        demoSlug = data.document_number;
        // First click only — preserves time-to-first-click as a measurement.
        if (!data.email_clicked_at) {
          await supabase.from("leads").update({ email_clicked_at: now }).eq("id", leadId);
        }
      }

      // Move the lead onto the warm track. Touch 3b (asks what's stopping them)
      // replaces touch 3 (handles the "what's the catch" objection) for anyone
      // who has actually looked.
      await supabase
        .from("lead_email_state")
        .update({ status: "clicked", last_event_at: now, updated_at: now })
        .eq("lead_id", leadId)
        .eq("status", "active");
    } catch {
      // Deliberately swallowed — a tracking failure must not cost the click.
    }
  }

  // ?src carries through so the demo page can record acquisition_channel.
  const target = new URL(demoSlug ? `/demo/${demoSlug}` : "/demo", request.url);
  target.searchParams.set("src", src);
  return NextResponse.redirect(target);
}
