import { NextRequest, NextResponse } from "next/server";
import { createServerClient, createServiceRoleClient } from "@/lib/supabase";

export const dynamic = "force-dynamic";

/**
 * PATCH /api/potential-customers/[id] — mark a sign-up paid or lost.
 *
 * Marking paid is the manual counterpart to the Stripe webhook: it creates the
 * customer record and stamps the lead, so the funnel is correct whether the
 * money arrived through Stripe or some other way (bank transfer, cash, invoice).
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const authed = await createServerClient();
  const {
    data: { user },
  } = await authed.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  let body: { status?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const status = body.status;
  if (status !== "paid" && status !== "lost" && status !== "new") {
    return NextResponse.json({ error: "status must be paid, lost or new" }, { status: 400 });
  }

  const supabase = createServiceRoleClient();
  const now = new Date().toISOString();

  const { data: pc, error: pcErr } = await supabase
    .from("potential_customers")
    .update({ status, converted_at: status === "paid" ? now : null })
    .eq("id", id)
    .select("id, lead_id, demo_slug, email, full_name, source, status")
    .maybeSingle();

  if (pcErr) return NextResponse.json({ error: pcErr.message }, { status: 500 });
  if (!pc) return NextResponse.json({ error: "Sign-up not found" }, { status: 404 });

  if (status === "paid") {
    let lead: {
      id: string;
      business_name: string;
      contact_phone: string | null;
      city: string | null;
      state: string | null;
      street_address: string | null;
      zip: string | null;
      business_category: string | null;
    } | null = null;

    if (pc.lead_id) {
      const { data } = await supabase
        .from("leads")
        .select("id, business_name, contact_phone, city, state, street_address, zip, business_category")
        .eq("id", pc.lead_id)
        .maybeSingle();
      lead = data ?? null;
    }

    // Don't create a second customer row if the Stripe webhook already did.
    const { data: existing } = await supabase
      .from("customers")
      .select("id")
      .eq("lead_id", pc.lead_id ?? "")
      .maybeSingle();

    if (!existing) {
      await supabase.from("customers").insert({
        business_name: lead?.business_name ?? pc.full_name ?? "Unknown business",
        email: pc.email ?? "unknown@unknown.invalid",
        phone: lead?.contact_phone ?? null,
        industry: lead?.business_category ?? null,
        address_street: lead?.street_address ?? null,
        address_city: lead?.city ?? null,
        address_state: lead?.state ?? "FL",
        address_zip: lead?.zip ?? null,
        demo_url: pc.demo_slug ? `/demo-sites/${pc.demo_slug}` : null,
        subscription_status: "active",
        hosting_status: "pending",
        lead_id: pc.lead_id,
      });
    }

    if (pc.lead_id) {
      await supabase
        .from("leads")
        .update({ converted_at: now, contact_status: "customer" })
        .eq("id", pc.lead_id);

      await supabase.from("outreach_events").insert({
        lead_id: pc.lead_id,
        channel: pc.source ?? "direct",
        event_type: "paid",
      });
    }
  }

  return NextResponse.json({ ok: true, potentialCustomer: pc });
}
