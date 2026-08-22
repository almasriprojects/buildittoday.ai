import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase";

// GET /api/track/click?lead={id} — email link click tracking.
// Logs a 'clicked' outreach_event (email channel), stamps leads.email_clicked_at,
// then redirects the visitor to the lead's demo site.
//
// If the lead or demo slug can't be resolved, we still redirect somewhere safe
// (the /demo index) rather than erroring — the email link must never break.

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const leadId = searchParams.get("lead");
  const channel = searchParams.get("channel") === "postcard" ? "postcard" : "email";

  let demoSlug: string | null = null;

  if (leadId) {
    try {
      const supabase = createServiceRoleClient();

      await supabase.from("outreach_events").insert({
        lead_id: leadId,
        channel,
        event_type: "clicked",
      });

      const { data } = await supabase
        .from("leads")
        .select("document_number")
        .eq("id", leadId)
        .maybeSingle();

      if (data?.document_number) {
        demoSlug = data.document_number;
        await supabase
          .from("leads")
          .update({ email_clicked_at: new Date().toISOString() })
          .eq("id", leadId);
      }
    } catch {
      // Tracking must never break the redirect.
    }
  }

  return NextResponse.redirect(
    new URL(demoSlug ? `/demo/${demoSlug}` : "/demo", request.url)
  );
}