import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase";

export const dynamic = "force-dynamic";

/**
 * POST /api/track/offer — the offer was shown, or a package was clicked.
 *
 * These two events are what separate three very different problems: viewed but
 * never offered means the trigger is wrong; offered but never clicked means the
 * price or packaging is wrong; clicked but never paid means the claim page is
 * wrong. Without them all three look identical from the outside.
 *
 * Called via sendBeacon during unload, so it must stay cheap and must never
 * matter if it fails.
 */
const ALLOWED = new Set(["offer_shown", "offer_clicked"]);

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const event = String(body.event ?? "");
    if (!ALLOWED.has(event)) {
      return NextResponse.json({ ok: false }, { status: 204 });
    }

    const slug = String(body.slug ?? "").trim();
    const tier = body.tier ? String(body.tier).slice(0, 24) : null;
    let leadId: string | null =
      typeof body.lead === "string" && body.lead.length === 36 ? body.lead : null;

    const supabase = createServiceRoleClient();

    // The page supplies the lead id, so never trust it — resolve from the slug
    // when it is missing, and let the foreign key reject anything invented.
    if (!leadId && slug) {
      const { data } = await supabase
        .from("leads").select("id").eq("demo_slug", slug).maybeSingle();
      leadId = data?.id ?? null;
    }
    if (!leadId) return NextResponse.json({ ok: false }, { status: 204 });

    await supabase.from("outreach_events").insert({
      lead_id: leadId,
      channel: "email",
      event_type: tier ? `${event}:${tier}` : event,
    });

    if (event === "offer_clicked") {
      await supabase
        .from("leads")
        .update({ potential_customer_at: new Date().toISOString() })
        .eq("id", leadId)
        .is("potential_customer_at", null);
    }

    return NextResponse.json({ ok: true });
  } catch {
    // A tracking failure must never surface to the visitor.
    return NextResponse.json({ ok: false }, { status: 204 });
  }
}
