import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase";

// Edge function names — keep in sync with /api/leads/process/route.ts
const EDGE_FUNCTIONS = {
  pull: "sunbiz-pull", // Step 1: fetch new SunBiz file -> save txt to bucket -> populate leads
  classify: "classify-leads", // Step 2: classify leads (business_category, target_fit)
  maps: "maps-check-leads", // Step 3: check leads on Google Maps (found_on_maps, phone, website, rating)
  skip: "skip-trace-leads", // Step 4: skip-trace leads (DataSkip -> contact name/phone/email)
  enrich: "enrich-leads", // Step 5: enrich leads (DataSkip, website detection) — UPDATE NAME
  geocode: "geocode-leads", // Step 6: fill latitude/longitude from addresses (Photon)
};

// GET /api/leads/cron — daily scheduled trigger (Vercel Cron)
// Protected by the CRON_SECRET header that Vercel sends automatically.
export async function GET(request: NextRequest) {
  // Verify the cron secret to prevent unauthorized invocations.
  const auth = request.headers.get("authorization");
  const expected = `Bearer ${process.env.CRON_SECRET ?? ""}`;
  if (!process.env.CRON_SECRET || auth !== expected) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createServiceRoleClient();
  const baseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const results: { function: string; ok: boolean; data?: unknown; error?: string }[] = [];

  // Run an edge function synchronously (fast steps like sunbiz-pull).
  const runAwaited = async (fn: string) => {
    try {
      const { data, error } = await supabase.functions.invoke(fn, { body: {} });
      return { function: fn, ok: !error, data, error: error?.message };
    } catch (err: any) {
      return { function: fn, ok: false, error: err.message || "Invoke failed" };
    }
  };

  // Fire-and-forget long-running steps (classify, maps, skip) so the cron
  // doesn't time out on Vercel (60s limit). Supabase processes them independently.
  const runBackground = (fn: string) => {
    fetch(`${baseUrl}/functions/v1/${fn}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({}),
    }).catch((err) => {
      console.error(`Fire-and-forget ${fn} error:`, err);
    });
    return { function: fn, ok: true, data: "started_in_background" };
  };

  // Daily pipeline: pull (await) -> classify/maps/skip (background) -> enrich (await once deployed).
  // sunbiz-pull has built-in dedup: if today's file was already processed,
  // it returns { skipped: true } and no duplicates are created.
  results.push(await runAwaited(EDGE_FUNCTIONS.pull));
  for (const fn of [EDGE_FUNCTIONS.classify, EDGE_FUNCTIONS.maps, EDGE_FUNCTIONS.skip, EDGE_FUNCTIONS.geocode]) {
    results.push(runBackground(fn));
  }
  results.push(await runAwaited(EDGE_FUNCTIONS.enrich));

  const failed = results.filter((r) => !r.ok);
  return NextResponse.json(
    {
      success: failed.length === 0,
      results,
      message: failed.length === 0
        ? "Daily pipeline completed successfully."
        : `${failed.length} step(s) failed. Check the results for details.`,
    },
    { status: failed.length === 0 ? 200 : 207 }
  );
}