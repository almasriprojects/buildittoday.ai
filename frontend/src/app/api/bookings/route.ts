import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase";

export const dynamic = "force-dynamic";

const SLOTS = new Set([
  "1:30 PM", "2:00 PM", "2:30 PM", "3:00 PM", "3:30 PM", "4:00 PM", "4:30 PM",
]);

// POST /api/bookings — record a call request from the homepage calendar.
export async function POST(request: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const name = String(body.name ?? "").trim();
  const email = String(body.email ?? "").trim();
  const date = String(body.date ?? "").trim();
  const slot = String(body.slot ?? "").trim();

  if (!name || !email || !date || !slot) {
    return NextResponse.json(
      { error: "Name, email, date and time are all required." },
      { status: 400 }
    );
  }
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return NextResponse.json({ error: "That email address doesn't look right." }, { status: 400 });
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json({ error: "Invalid date." }, { status: 400 });
  }
  if (!SLOTS.has(slot)) {
    return NextResponse.json({ error: "That time slot isn't available." }, { status: 400 });
  }

  // A booking in the past is always a bug or a stale tab, never intent.
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (new Date(`${date}T00:00:00`) < today) {
    return NextResponse.json({ error: "Please choose a date in the future." }, { status: 400 });
  }

  const supabase = createServiceRoleClient();

  // If this came from a demo page, tie the booking to that lead so the request
  // shows up against the business it belongs to.
  let leadId: string | null = null;
  const demoSlug = body.demoSlug ? String(body.demoSlug) : null;
  if (demoSlug) {
    const { data } = await supabase
      .from("leads")
      .select("id")
      .eq("demo_slug", demoSlug)
      .maybeSingle();
    leadId = data?.id ?? null;
  }

  const { error } = await supabase.from("booking_requests").insert({
    name,
    email,
    phone: body.phone ? String(body.phone).trim() : null,
    business_name: body.businessName ? String(body.businessName).trim() : null,
    requested_date: date,
    requested_slot: slot,
    notes: body.notes ? String(body.notes).trim() : null,
    demo_slug: demoSlug,
    lead_id: leadId,
  });

  if (error) {
    return NextResponse.json(
      { error: "We couldn't save that. Please try again or email us." },
      { status: 500 }
    );
  }

  // Somebody asked to talk. Nothing else in this project matters more.
  //
  // Before this, a booking was written to the table and that was the end of
  // it: no notification, nothing on a phone, and the only way to find out was
  // to remember to open /admin/bookings. The calendar has existed for weeks
  // and taken zero bookings, so that silence has never been tested — but the
  // first real one must not sit unseen for a day.
  try {
    const { alert } = await import("@/lib/telegram");
    await alert(
      "payment",
      `${(body.businessName ? String(body.businessName).trim() : "") || name} wants to talk`,
      [
        `${date} at ${slot}`,
        body.phone ? `Call them on ${String(body.phone).trim()}` : `No phone given — reply to ${email}`,
        email,
        body.notes ? `\n"${String(body.notes).trim().slice(0, 300)}"` : "",
        `\nbuildittoday.ai/admin/bookings`,
      ].filter(Boolean).join("\n"),
    );
  } catch {
    // A failed notification must never lose the booking itself.
  }

  return NextResponse.json({ ok: true });
}
