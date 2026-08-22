import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase";

// GET /api/track/open?lead={id} — email open tracking pixel.
// Returns a transparent 1x1 GIF so it can be embedded in HTML emails.
// Logs an 'opened' outreach_event for the lead (email channel) and stamps
// leads.email_opened_at if it hasn't already been set.
//
// The pixel never blocks the email: any failure is silently ignored and the
// GIF is still returned.

const TRANSPARENT_GIF = Buffer.from(
  "R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==",
  "base64"
);

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const leadId = searchParams.get("lead");
  const channel = searchParams.get("channel") === "postcard" ? "postcard" : "email";

  if (leadId) {
    try {
      const supabase = createServiceRoleClient();
      await supabase.from("outreach_events").insert({
        lead_id: leadId,
        channel,
        event_type: "opened",
      });
      await supabase
        .from("leads")
        .update({ email_opened_at: new Date().toISOString() })
        .eq("id", leadId);
    } catch {
      // Never break the email render for tracking failures.
    }
  }

  return new NextResponse(TRANSPARENT_GIF, {
    headers: {
      "Content-Type": "image/gif",
      "Cache-Control": "no-store, no-cache, must-revalidate",
      "Content-Length": String(TRANSPARENT_GIF.length),
    },
  });
}