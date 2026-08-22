import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase";

// Edge function names — update these to match the deployed Supabase functions.
// Confirmed deployed: sunbiz-pull, classify-leads, generate-site.
// The enrichment functions (DataSkip / Maps / website detection) are configurable
// here so they can be wired once their exact names are known.
const EDGE_FUNCTIONS = {
  pull: "sunbiz-pull", // Step 1: fetch new SunBiz file -> save txt to bucket -> populate leads
  classify: "classify-leads", // Step 2: classify leads (business_category, target_fit)
  maps: "maps-check-leads", // Step 3: check leads on Google Maps (found_on_maps, phone, website, rating)
  skip: "skip-trace-leads", // Step 4: skip-trace leads (DataSkip -> contact name/phone/email)
  enrich: "enrich-leads", // Step 5: enrich leads (DataSkip, website detection) — UPDATE NAME
  generate: "generate-site", // Step 6: generate demo site for a lead
};

// POST /api/leads/process — trigger the lead pipeline edge functions
// Body: { action: "pull" | "classify" | "enrich" | "generate" | "all", leadId?: string }
//
// classify-leads processes leads in batches and can take several minutes
// (observed: 475 leads in ~2 minutes). Running it synchronously would exceed
// Vercel's function timeout, so we fire-and-forget it in the background:
// the request triggers the edge function and returns immediately.
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action = "all", leadId, force = false } = body;

    const supabase = createServiceRoleClient();
    const baseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

    // Build the payload for the edge function. `force` bypasses the
    // sunbiz-pull dedup so today's file can be re-downloaded.
    const edgeBody = leadId ? { leadId } : force ? { force: true } : {};

    // Run an edge function synchronously and wait for its response (fast steps).
    const runAwaited = async (fn: string) => {
      try {
        const { data, error } = await supabase.functions.invoke(fn, {
          body: edgeBody,
        });
        return { function: fn, ok: !error, data, error: error?.message };
      } catch (err: any) {
        return { function: fn, ok: false, error: err.message || "Invoke failed" };
      }
    };

    // When a leadId is provided (detail page), the edge functions process just
    // ONE lead and complete in seconds — safe to await and get real feedback.
    // Without leadId (list page / bulk), classify/maps process thousands of
    // leads and take minutes — must stay fire-and-forget to avoid timeouts.
    const fast = Boolean(leadId);

    // Trigger a long-running edge function without waiting. The request is
    // dispatched to Supabase, which processes it independently even after
    // this route returns. The dispatch HTTP status is captured so failures
    // (e.g. 502, network) are reported instead of silently swallowed.
    const runBackground = async (fn: string) => {
      try {
        const res = await fetch(`${baseUrl}/functions/v1/${fn}`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(edgeBody),
        });
        if (!res.ok) {
          const text = await res.text();
          return {
            function: fn,
            ok: false,
            error: `Background dispatch failed (HTTP ${res.status}): ${text.slice(0, 300)}`,
          };
        }
        return { function: fn, ok: true, data: "started_in_background" };
      } catch (err: any) {
        return {
          function: fn,
          ok: false,
          error: `Background dispatch failed: ${err.message || "Network error"}`,
        };
      }
    };

    // Determine which edge functions to run based on the requested action.
    const steps: { fn: string; mode: "await" | "background" }[] =
      action === "all"
        ? [
            { fn: EDGE_FUNCTIONS.pull, mode: "await" },
            { fn: EDGE_FUNCTIONS.classify, mode: fast ? "await" : "background" },
            { fn: EDGE_FUNCTIONS.maps, mode: fast ? "await" : "background" },
            { fn: EDGE_FUNCTIONS.skip, mode: fast ? "await" : "background" },
            { fn: EDGE_FUNCTIONS.enrich, mode: fast ? "await" : "background" },
          ]
        : action === "pull"
        ? [{ fn: EDGE_FUNCTIONS.pull, mode: "await" }]
        : action === "classify"
        ? [{ fn: EDGE_FUNCTIONS.classify, mode: fast ? "await" : "background" }]
        : action === "maps"
        ? [{ fn: EDGE_FUNCTIONS.maps, mode: fast ? "await" : "background" }]
        : action === "skip"
        ? [{ fn: EDGE_FUNCTIONS.skip, mode: fast ? "await" : "background" }]
        : action === "enrich"
        ? [{ fn: EDGE_FUNCTIONS.enrich, mode: fast ? "await" : "background" }]
        : action === "generate"
        ? [{ fn: EDGE_FUNCTIONS.generate, mode: "await" }]
        : [];

    if (steps.length === 0) {
      return NextResponse.json(
        { error: "Invalid action. Use pull, classify, maps, skip, enrich, generate, or all." },
        { status: 400 }
      );
    }

    const results: { function: string; ok: boolean; data?: unknown; error?: string }[] = [];

    for (const step of steps) {
      const res =
        step.mode === "background"
          ? await runBackground(step.fn)
          : await runAwaited(step.fn);
      results.push(res);
    }

    const failed = results.filter((r) => !r.ok);
    const startedInBackground = results.some((r) => r.data === "started_in_background");

    return NextResponse.json(
      {
        success: failed.length === 0,
        results,
        message: startedInBackground
          ? "Classification started in the background. It processes leads in batches and may take a few minutes to complete. Refresh to see updated results."
          : failed.length === 0
          ? "Pipeline steps completed successfully."
          : `${failed.length} step(s) failed. Check the results for details.`,
      },
      { status: failed.length === 0 ? 200 : 207 }
    );
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}