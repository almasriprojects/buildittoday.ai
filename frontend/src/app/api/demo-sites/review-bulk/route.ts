import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase";
import { requireAdmin } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

// Only non-destructive, reason-free decisions may be applied in bulk.
// Reject and needs_regen require a per-site note to be worth anything later,
// and one note pasted across many sites is a lie about why each failed.
const BULK_ALLOWED = ["approved", "skipped", "pending"] as const;
type BulkStatus = (typeof BULK_ALLOWED)[number];

const MAX_SLUGS = 500;

export async function POST(request: NextRequest) {
  const gate = await requireAdmin();
  if (!gate.ok) return gate.response;

  let body: { slugs?: unknown; status?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const status = body.status as BulkStatus;
  if (!BULK_ALLOWED.includes(status)) {
    return NextResponse.json(
      { error: `status must be one of: ${BULK_ALLOWED.join(", ")}` },
      { status: 400 }
    );
  }

  const slugs = Array.isArray(body.slugs)
    ? [...new Set(body.slugs.filter((s): s is string => typeof s === "string" && s.length > 0))]
    : [];
  if (slugs.length === 0) {
    return NextResponse.json({ error: "No sites selected" }, { status: 400 });
  }
  if (slugs.length > MAX_SLUGS) {
    return NextResponse.json(
      { error: `Too many at once (${slugs.length}); max ${MAX_SLUGS}` },
      { status: 400 }
    );
  }

  const supabase = createServiceRoleClient();
  const { data, error } = await supabase
    .from("demo_sites")
    .update({
      review_status: status,
      reviewed_at: new Date().toISOString(),
      reviewed_by: gate.email,
    })
    .in("demo_slug", slugs)
    .select("demo_slug, review_status");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Report per-slug so a partial failure is visible rather than silently
  // looking like success.
  const updated = new Set((data ?? []).map((r) => r.demo_slug));
  const missed = slugs.filter((s) => !updated.has(s));

  return NextResponse.json({
    ok: true,
    status,
    updated: [...updated],
    updatedCount: updated.size,
    missed,
  });
}
