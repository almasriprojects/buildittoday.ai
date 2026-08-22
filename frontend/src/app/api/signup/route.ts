import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase";

// POST /api/signup — visitor signs up to unlock the demo site.
// Body: { demoSlug, fullName, email, src? }
//   - Resolves the lead from leads by demo_slug (service-role bypasses RLS;
//     the public_demo_sites view intentionally has no lead_id column since
//     it's the anon-facing security boundary, so this route can't use it)
//   - Upserts a potential_customers row (source from ?src=email|postcard)
//   - Logs a 'signed_up' outreach_event
//   - Stamps leads.signup_completed_at + potential_customer_at
//   - Returns ok + a token the demo page stores in a cookie so the full
//     demo renders on refresh.

function isValidEmail(email: string): boolean {
  const trimmed = email.trim();
  if (!trimmed.includes("@")) return false;
  const [local, domain] = trimmed.split("@");
  if (!local || !domain || !domain.includes(".")) return false;
  return trimmed.length >= 5 && trimmed.length <= 254;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const demoSlug = String(body.demoSlug ?? "").trim();
    const fullName = String(body.fullName ?? "").trim();
    const email = String(body.email ?? "").trim();
    const src = body.src === "postcard" ? "postcard" : "email";

    if (!demoSlug || !fullName || !isValidEmail(email)) {
      return NextResponse.json(
        { error: "demoSlug, fullName, and a valid email are required." },
        { status: 400 }
      );
    }

    const supabase = createServiceRoleClient();

    // Resolve the demo site + lead from the slug.
    const { data: demo, error: demoError } = await supabase
      .from("leads")
      .select("id, business_name")
      .eq("demo_slug", demoSlug)
      .eq("site_generated", true)
      .maybeSingle();

    if (demoError || !demo) {
      return NextResponse.json(
        { error: "Demo site not found." },
        { status: 404 }
      );
    }

    const leadId = demo.id;

    // Upsert the potential customer (one per lead; keep the original source).
    const { data: existing } = await supabase
      .from("potential_customers")
      .select("id")
      .eq("lead_id", leadId)
      .maybeSingle();

    let potentialCustomerId: string;
    if (existing?.id) {
      potentialCustomerId = existing.id;
    } else {
      const { data: inserted, error: insertError } = await supabase
        .from("potential_customers")
        .insert({
          lead_id: leadId,
          demo_slug: demoSlug,
          email,
          full_name: fullName,
          source: src,
          status: "new",
        })
        .select("id")
        .single();

      if (insertError || !inserted) {
        return NextResponse.json(
          { error: insertError?.message || "Could not create potential customer." },
          { status: 500 }
        );
      }
      potentialCustomerId = inserted.id;
    }

    // Log the attribution event + stamp the lead timestamps.
    const now = new Date().toISOString();
    await supabase.from("outreach_events").insert({
      lead_id: leadId,
      channel: src,
      event_type: "signed_up",
    });
    await supabase
      .from("leads")
      .update({
        signup_completed_at: now,
        potential_customer_at: now,
        acquisition_channel: src,
      })
      .eq("id", leadId);

    return NextResponse.json({
      ok: true,
      business_name: demo.business_name,
      token: potentialCustomerId,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}