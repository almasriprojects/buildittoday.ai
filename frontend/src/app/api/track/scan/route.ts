import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase";

// GET /api/track/scan?lead={id} — QR code scan tracking (postcards).
// Logs a 'scanned' outreach_event (postcard channel), stamps leads.qr_scanned_at,
// then redirects the visitor to the lead's demo site with ?src=postcard so the
// sign-up gate attributes the channel correctly.
//
// If the lead or demo slug can't be resolved, we still redirect somewhere safe
// (the /demo index) rather than erroring — the QR code must never break.

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const leadId = searchParams.get("lead");

  let demoSlug: string | null = null;

  if (leadId) {
    try {
      const supabase = createServiceRoleClient();

      await supabase.from("outreach_events").insert({
        lead_id: leadId,
        channel: "postcard",
        event_type: "scanned",
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
          .update({ qr_scanned_at: new Date().toISOString() })
          .eq("id", leadId);
      }
    } catch {
      // Tracking must never break the redirect.
    }
  }

  const target = new URL(demoSlug ? `/demo/${demoSlug}` : "/demo", request.url);
  if (demoSlug) {
    target.searchParams.set("src", "postcard");
  }
  return NextResponse.redirect(target);
}