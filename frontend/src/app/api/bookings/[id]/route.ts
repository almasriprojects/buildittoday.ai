import { NextRequest, NextResponse } from "next/server";
import { createServerClient, createServiceRoleClient } from "@/lib/supabase";

export const dynamic = "force-dynamic";

const ALLOWED = ["new", "confirmed", "completed", "cancelled", "no_show"] as const;

// PATCH /api/bookings/[id] — move a booking through its lifecycle.
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

  let body: { status?: string; notes?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const status = body.status as (typeof ALLOWED)[number] | undefined;
  if (!status || !ALLOWED.includes(status)) {
    return NextResponse.json(
      { error: `status must be one of: ${ALLOWED.join(", ")}` },
      { status: 400 }
    );
  }

  const supabase = createServiceRoleClient();
  const patch: Record<string, unknown> = { status };
  if (typeof body.notes === "string") patch.notes = body.notes.trim() || null;

  const { data, error } = await supabase
    .from("booking_requests")
    .update(patch)
    .eq("id", id)
    .select("id, status, notes")
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: "Booking not found" }, { status: 404 });

  return NextResponse.json({ ok: true, booking: data });
}
