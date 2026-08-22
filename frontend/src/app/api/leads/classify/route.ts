import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase";

export const dynamic = "force-dynamic";
// One classify-leads invocation self-limits to ~127s, so allow headroom.
export const maxDuration = 300;

async function countUnclassified() {
  const supabase = createServiceRoleClient();
  const { count } = await supabase
    .from("leads")
    .select("*", { count: "exact", head: true })
    .is("target_fit", null);
  return count ?? 0;
}

// GET — progress only, for the admin UI to show how much is left.
export async function GET() {
  const supabase = createServiceRoleClient();
  const [{ count: unclassified }, { count: total }, { count: qualified }] = await Promise.all([
    supabase.from("leads").select("*", { count: "exact", head: true }).is("target_fit", null),
    supabase.from("leads").select("*", { count: "exact", head: true }),
    supabase.from("leads").select("*", { count: "exact", head: true }).eq("target_fit", "yes"),
  ]);
  return NextResponse.json({
    unclassified: unclassified ?? 0,
    total: total ?? 0,
    classified: (total ?? 0) - (unclassified ?? 0),
    qualified: qualified ?? 0,
  });
}

/**
 * POST — run ONE classify-leads batch and report what happened.
 *
 * Deliberately one batch per request, not a server-side loop: the edge function
 * runs ~127s and Vercel would time out on a full sweep. The client loops on
 * this endpoint, which also means progress is visible after every batch instead
 * of the UI sitting silent for 50 minutes.
 */
export async function POST(_request: NextRequest) {
  const before = await countUnclassified();
  if (before === 0) {
    return NextResponse.json({ ok: true, classified: 0, remaining: 0, done: true });
  }

  const supabase = createServiceRoleClient();
  const started = Date.now();

  const { data, error } = await supabase.functions.invoke("classify-leads", { body: {} });

  if (error) {
    return NextResponse.json(
      { ok: false, error: error.message, remaining: before },
      { status: 502 }
    );
  }

  const remaining = await countUnclassified();

  return NextResponse.json({
    ok: true,
    classified: (data as { leadsClassified?: number } | null)?.leadsClassified ?? before - remaining,
    batches: (data as { batchesCompleted?: number } | null)?.batchesCompleted ?? null,
    remaining,
    done: remaining === 0,
    elapsedMs: Date.now() - started,
  });
}
