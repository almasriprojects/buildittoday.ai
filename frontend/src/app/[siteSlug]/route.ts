import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase";

/**
 * GET /{business-name} — the site itself, at a URL worth sending someone.
 *
 * This is what goes in the outreach email. The previous address was
 * /demo-sites/L26000421575, which told the recipient two things before they
 * had read a word: that it was a demo, and that they were a filing number.
 *
 * Static routes win over dynamic ones in the App Router, so /pricing and the
 * rest are unaffected. RESERVED is a second line of defence for paths that do
 * not exist yet, so a business called "Admin Cleaning" can never take one.
 */

export const dynamic = "force-dynamic";

const RESERVED = new Set([
  "admin", "api", "auth", "claim", "demo", "demo-sites", "leads", "intake",
  "pricing", "services", "faq", "privacy", "terms", "colors", "site", "sites",
  "login", "logout", "register", "dashboard", "account", "settings", "billing",
  "support", "help", "about", "contact", "blog", "docs", "status",
  "sitemap.xml", "robots.txt", "favicon.ico", "opengraph-image", "icon",
]);

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ siteSlug: string }> }
) {
  const { siteSlug } = await params;
  const slug = decodeURIComponent(siteSlug).toLowerCase();

  if (RESERVED.has(slug) || slug.startsWith("_") || slug.includes(".")) {
    return new NextResponse("Not found", { status: 404 });
  }

  const supabase = createServiceRoleClient();
  const { data: site } = await supabase
    .from("demo_sites")
    .select("demo_slug, storage_path, status")
    .eq("public_slug", slug)
    .eq("status", "ready")
    .maybeSingle();

  if (!site?.storage_path) {
    return new NextResponse("Not found", { status: 404 });
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  const res = await fetch(`${url}/storage/v1/object/demo-sites/${site.storage_path}`, {
    headers: { Authorization: `Bearer ${key}`, apikey: key },
    cache: "no-store",
  });
  if (!res.ok) return new NextResponse("Not found", { status: 404 });

  // Point every asset at our own domain. The stored HTML hardcodes storage
  // URLs, and rewriting on the way out avoids rewriting 43 files — and keeps
  // working for every site generated after this.
  const html = (await res.text()).replaceAll(
    /https:\/\/[a-z0-9]+\.supabase\.co\/storage\/v1\/object\/public\/demo-media\//g,
    "/m/"
  );

  // Recorded after the HTML is in hand, so a tracking failure can never cost
  // the visitor their page.
  recordView(site.demo_slug, request).catch(() => {});

  return new NextResponse(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store",
      // A sample built from public records should not be indexed under someone
      // else's business name — that would rank ahead of their real site.
      "X-Robots-Tag": "noindex, nofollow",
    },
  });
}

async function recordView(demoSlug: string, request: NextRequest) {
  const url = new URL(request.url);
  if (url.searchParams.get("admin") === "1") return; // in-admin preview

  const supabase = createServiceRoleClient();
  const src = url.searchParams.get("src");
  const now = new Date().toISOString();

  const { data: lead } = await supabase
    .from("leads")
    .select("id, demo_viewed_at, email_clicked_at, acquisition_channel")
    .eq("demo_slug", demoSlug)
    .maybeSingle();
  if (!lead) return;

  const channel = src === "postcard" ? "postcard" : "email";
  const patch: Record<string, string> = {};
  if (!lead.demo_viewed_at) patch.demo_viewed_at = now;
  if (src && !lead.acquisition_channel) patch.acquisition_channel = src;

  // This page is now the link in the email, so arriving here with ?src is the
  // click — the separate /api/track/click hop no longer sits in front of it.
  // First click only, so time-to-first-click stays measurable.
  const isFromOutreach = Boolean(src);
  if (isFromOutreach && !lead.email_clicked_at) patch.email_clicked_at = now;

  if (Object.keys(patch).length) {
    await supabase.from("leads").update(patch).eq("id", lead.id);
  }

  await supabase.from("outreach_events").insert([
    ...(isFromOutreach
      ? [{ lead_id: lead.id, channel, event_type: "clicked" }]
      : []),
    { lead_id: lead.id, channel, event_type: "viewed" },
  ]);

  // Moves the lead onto the warm track, which is what makes touch 3 switch
  // from handling the "what's the catch" objection to asking what stopped them.
  if (isFromOutreach) {
    await supabase
      .from("lead_email_state")
      .update({ status: "clicked", last_event_at: now, updated_at: now })
      .eq("lead_id", lead.id)
      .eq("status", "active");
  }
}
