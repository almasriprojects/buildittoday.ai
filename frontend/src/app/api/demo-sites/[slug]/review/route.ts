import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase";
import { requireAdmin } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

const ALLOWED = ["pending", "approved", "rejected", "needs_regen", "skipped"] as const;
type ReviewStatus = (typeof ALLOWED)[number];

// POST /api/demo-sites/[slug]/review — record a review decision on a demo.
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;

  // Only a signed-in admin may change review state.
  const gate = await requireAdmin();
  if (!gate.ok) return gate.response;

  let body: { status?: string; note?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const status = body.status as ReviewStatus | undefined;
  if (!status || !ALLOWED.includes(status)) {
    return NextResponse.json(
      { error: `status must be one of: ${ALLOWED.join(", ")}` },
      { status: 400 }
    );
  }

  const supabase = createServiceRoleClient();
  const { data, error } = await supabase
    .from("demo_sites")
    .update({
      review_status: status,
      review_note: body.note?.trim() || null,
      reviewed_at: new Date().toISOString(),
      reviewed_by: gate.email,
    })
    .eq("demo_slug", slug)
    .select("demo_slug, review_status, review_note, reviewed_at, reviewed_by")
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (!data) {
    return NextResponse.json({ error: `No demo site for slug ${slug}` }, { status: 404 });
  }

  return NextResponse.json({ ok: true, review: data });
}
