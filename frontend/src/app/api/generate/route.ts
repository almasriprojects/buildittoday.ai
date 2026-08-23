import { NextRequest, NextResponse } from "next/server";
import { createServerClient, createServiceRoleClient } from "@/lib/supabase";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

/**
 * POST /api/generate — generate website copy for a lead.
 *
 * Body: { leadId } for one lead, or { maxLeads } to work through the queue.
 * Delegates to the generate-site edge function, which owns the eligibility
 * rules (qualified, enriched, no existing website) and the content prompt.
 */
export async function POST(request: NextRequest) {
  const authed = await createServerClient();
  const {
    data: { user },
  } = await authed.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  let body: { leadId?: string; maxLeads?: number };
  try {
    body = await request.json();
  } catch {
    body = {};
  }

  const { leadId } = body;
  const maxLeads = body.maxLeads ?? (leadId ? undefined : 5);

  if (!leadId && !maxLeads) {
    return NextResponse.json(
      { error: "Provide leadId to generate for one lead, or maxLeads for a batch." },
      { status: 400 }
    );
  }

  const supabase = createServiceRoleClient();
  const started = Date.now();

  const { data, error } = await supabase.functions.invoke("generate-site", {
    body: leadId ? { leadId } : { maxLeads },
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 502 });
  }

  const result = data as {
    ok?: boolean;
    processed?: number;
    succeeded?: number;
    failed?: number;
    error?: string;
    results?: { business_name: string; ok: boolean; demoSlug?: string; error?: string }[];
  } | null;

  if (result?.ok === false) {
    return NextResponse.json({ error: result.error ?? "Generation failed" }, { status: 502 });
  }

  return NextResponse.json({
    ok: true,
    processed: result?.processed ?? 0,
    succeeded: result?.succeeded ?? 0,
    failed: result?.failed ?? 0,
    results: result?.results ?? [],
    elapsedMs: Date.now() - started,
    // Copy only. The visual demo (images, video hero, HTML) is produced by the
    // media pipeline separately — a lead is not sendable until that has run.
    note: "Generated website copy. Demo media is produced by the media pipeline.",
  });
}

/**
 * GET /api/generate — how much of the generation queue is left.
 * Mirrors the eligibility filter inside generate-site.
 */
export async function GET() {
  const supabase = createServiceRoleClient();

  const [{ count: eligible }, { count: withCopy }, { count: withDemo }] = await Promise.all([
    supabase
      .from("leads")
      .select("*", { count: "exact", head: true })
      .eq("target_fit", "yes")
      .eq("dataskip_checked", true)
      .not("site_generated", "is", true)
      .is("maps_website", null),
    supabase.from("leads").select("*", { count: "exact", head: true }).not("generated_content", "is", null),
    supabase.from("demo_sites").select("*", { count: "exact", head: true }).eq("status", "ready"),
  ]);

  return NextResponse.json({
    eligible: eligible ?? 0,
    withCopy: withCopy ?? 0,
    withDemo: withDemo ?? 0,
  });
}
