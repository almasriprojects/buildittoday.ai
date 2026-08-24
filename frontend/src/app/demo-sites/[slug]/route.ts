import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase";

// GET /demo-sites/[slug] — serves the AI-generated bespoke HTML for a demo
// site (produced by generate-design-html, stored in the demo-sites bucket).
// Route Handlers bypass the root layout's <html>/<body>, so this can return
// a full standalone document as-is. /demo/[businessId] redirects here when
// a ready row exists in demo_sites.
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const supabase = createServiceRoleClient();

  const { data: site } = await supabase
    .from("demo_sites")
    .select("storage_path, public_slug")
    .eq("demo_slug", slug)
    .eq("status", "ready")
    .maybeSingle();

  // This address is kept alive only so links already sent keep working. The
  // canonical home of a site is /{business-name} — nobody should be looking at
  // a URL with "demo-sites" and a state filing number in it.
  if (site?.public_slug) {
    const to = new URL(`/${site.public_slug}`, request.url);
    const src = new URL(request.url).searchParams.get("src");
    if (src) to.searchParams.set("src", src);
    return NextResponse.redirect(to, 308);
  }

  if (!site || !site.storage_path) {
    return new NextResponse("Not found", { status: 404 });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  const fileRes = await fetch(
    `${supabaseUrl}/storage/v1/object/demo-sites/${site.storage_path}`,
    {
      headers: { Authorization: `Bearer ${serviceKey}`, apikey: serviceKey },
      cache: "no-store",
    }
  );

  if (!fileRes.ok) {
    return new NextResponse("Not found", { status: 404 });
  }

  const html = await fileRes.text();

  // This is the moment the lead actually looks at their site — the single most
  // meaningful signal in the funnel. It was never recorded, so "they scanned"
  // and "they looked" were indistinguishable. Logged after the HTML is in hand
  // so a tracking failure can never cost the visitor their page.
  recordView(slug, request).catch(() => {});

  return new NextResponse(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}

async function recordView(slug: string, request: NextRequest) {
  // ?admin=1 is the in-admin preview iframe — reviewing a demo is not a lead
  // viewing it, and counting it would inflate every number that follows.
  const url = new URL(request.url);
  if (url.searchParams.get("admin") === "1") return;

  const src = url.searchParams.get("src"); // 'postcard' | 'email' | null
  const supabase = createServiceRoleClient();

  const { data: lead } = await supabase
    .from("leads")
    .select("id, demo_viewed_at, acquisition_channel")
    .eq("demo_slug", slug)
    .maybeSingle();
  if (!lead) return;

  const patch: Record<string, unknown> = {};
  // First view only — otherwise a refresh rewrites the timestamp and you lose
  // the time-to-first-view measurement.
  if (!lead.demo_viewed_at) patch.demo_viewed_at = new Date().toISOString();
  // First attributable channel wins; a later untracked visit must not erase it.
  if (src && !lead.acquisition_channel) patch.acquisition_channel = src;

  if (Object.keys(patch).length > 0) {
    await supabase.from("leads").update(patch).eq("id", lead.id);
  }

  await supabase.from("outreach_events").insert({
    lead_id: lead.id,
    channel: src ?? "direct",
    event_type: "viewed",
  });
}
