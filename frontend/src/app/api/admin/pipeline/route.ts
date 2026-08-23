import { NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase";

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/pipeline — bookings, sign-ups and the attribution funnel.
 * Everything is a live query; nothing here is derived from a constant.
 */
export async function GET() {
  const supabase = createServiceRoleClient();

  const [bookings, potential, events, leadTotals] = await Promise.all([
    supabase
      .from("booking_requests")
      .select("id, name, email, phone, business_name, requested_date, requested_slot, status, demo_slug, notes, created_at")
      .order("requested_date", { ascending: true })
      .limit(200),
    supabase
      .from("potential_customers")
      .select("id, lead_id, demo_slug, email, full_name, source, status, converted_at, created_at")
      .order("created_at", { ascending: false })
      .limit(200),
    supabase.from("outreach_events").select("channel, event_type").limit(10000),
    supabase
      .from("leads")
      .select("outreach_sent_at, postcard_sent, demo_viewed_at, signup_completed_at, converted_at, acquisition_channel")
      .or("outreach_sent_at.not.is.null,postcard_sent.is.true,demo_viewed_at.not.is.null")
      .limit(10000),
  ]);

  // Funnel per channel, from the event log.
  const funnel: Record<string, Record<string, number>> = {};
  for (const e of events.data ?? []) {
    const ch = e.channel ?? "unknown";
    funnel[ch] ??= {};
    funnel[ch][e.event_type] = (funnel[ch][e.event_type] ?? 0) + 1;
  }

  // Lead-level totals — the event log can double-count (a lead may scan twice),
  // so conversion rates are computed from distinct leads instead.
  const leads = leadTotals.data ?? [];
  const byChannel: Record<string, { reached: number; viewed: number; signed: number; paid: number }> = {};
  for (const l of leads) {
    const ch = l.acquisition_channel ?? (l.postcard_sent ? "postcard" : l.outreach_sent_at ? "email" : "direct");
    byChannel[ch] ??= { reached: 0, viewed: 0, signed: 0, paid: 0 };
    byChannel[ch].reached++;
    if (l.demo_viewed_at) byChannel[ch].viewed++;
    if (l.signup_completed_at) byChannel[ch].signed++;
    if (l.converted_at) byChannel[ch].paid++;
  }

  return NextResponse.json({
    bookings: bookings.data ?? [],
    potentialCustomers: potential.data ?? [],
    funnelEvents: funnel,
    byChannel,
    totals: {
      bookings: (bookings.data ?? []).length,
      bookingsNew: (bookings.data ?? []).filter((b) => b.status === "new").length,
      signups: (potential.data ?? []).length,
      signupsPaid: (potential.data ?? []).filter((p) => p.status === "paid").length,
      leadsReached: leads.length,
    },
  });
}
