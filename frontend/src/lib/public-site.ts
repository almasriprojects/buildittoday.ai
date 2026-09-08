import { NextRequest, NextResponse } from "next/server";
import { offerLayer } from "@/lib/offer-layer";
import { fetchDistIndex, withBaseHref } from "@/lib/engine-ingest";
import { createServiceRoleClient } from "@/lib/supabase";

const RESERVED = new Set([
  "admin", "api", "auth", "claim", "demo", "demo-sites", "leads", "intake",
  "pricing", "services", "faq", "privacy", "terms", "colors", "site", "sites",
  "login", "logout", "register", "dashboard", "account", "settings", "billing",
  "support", "help", "about", "contact", "blog", "docs", "status", "integrations",
  "agents", "inventory", "analytics", "customers", "bookings", "emails",
  "sitemap.xml", "robots.txt", "favicon.ico", "opengraph-image", "icon",
]);

type ReadySite = {
  demo_slug: string;
  business_name: string | null;
  storage_path: string | null;
  generator_version: string | null;
};

function normalSlug(value: string): string | null {
  const slug = value.toLowerCase();
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) || RESERVED.has(slug)) return null;
  return slug;
}

function isEngineBuilt(version: string | null): boolean {
  return (version ?? "").startsWith("engine");
}

async function readySite(slug: string): Promise<ReadySite | null> {
  const safeSlug = normalSlug(slug);
  if (!safeSlug) return null;
  const { data } = await createServiceRoleClient()
    .from("demo_sites")
    .select("demo_slug, business_name, storage_path, generator_version")
    .eq("public_slug", safeSlug)
    .eq("status", "ready")
    .maybeSingle();
  return data as ReadySite | null;
}

/** Serve a generated site's document and inject the owner-facing offer layer. */
export async function renderPublicSite(
  request: NextRequest,
  rawSlug: string,
  { track = true }: { track?: boolean } = {},
): Promise<NextResponse> {
  const slug = normalSlug(rawSlug);
  if (!slug) return notFoundPage();
  const site = await readySite(slug);
  if (!site) return notFoundPage();

  let html: string;
  if (isEngineBuilt(site.generator_version)) {
    const raw = await fetchDistIndex(slug);
    if (raw === null) return notFoundPage();
    html = withBaseHref(raw, slug);
  } else {
    if (!site.storage_path) return notFoundPage();
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) return unavailablePage();
    const res = await fetch(`${url}/storage/v1/object/demo-sites/${site.storage_path}`, {
      headers: { Authorization: `Bearer ${key}`, apikey: key },
      cache: "no-store",
    });
    if (!res.ok) return notFoundPage();
    html = (await res.text()).replaceAll(
      /https:\/\/[a-z0-9]+\.supabase\.co\/storage\/v1\/object\/public\/demo-media\//g,
      "/m/",
    );
  }

  if (new URL(request.url).searchParams.get("admin") !== "1") {
    const supabase = createServiceRoleClient();
    const { data: lead } = await supabase
      .from("leads")
      .select("id")
      .eq("demo_slug", site.demo_slug)
      .maybeSingle();
    const layer = offerLayer({
      businessName: site.business_name ?? "your business",
      demoSlug: site.demo_slug,
      leadId: lead?.id ?? null,
    });
    html = html.includes("</body>")
      ? html.replace(/<\/body>/i, `${layer}</body>`)
      : html + layer;
  }

  // Both slugs: demo_slug identifies the lead, publicSlug is the address a
  // human can actually open.
  if (track) recordView(site.demo_slug, slug, request).catch(() => {});
  return new NextResponse(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Robots-Tag": "noindex, nofollow",
    },
  });
}

export function isAssetPath(path: string): boolean {
  return /\.(?:avif|css|gif|ico|jpe?g|js|map|mjs|mp4|png|svg|txt|webm|woff2?|xml)$/i.test(path);
}

/** Stream one engine-build asset without exposing its index or crawl files. */
export async function serveEngineAsset(rawSlug: string, path: string): Promise<NextResponse | null> {
  const slug = normalSlug(rawSlug);
  if (!slug || !path || path.split("/").some((part) => !part || part === "." || part === "..")) return null;
  if (["index.html", "robots.txt", "sitemap.xml"].includes(path)) return null;

  const site = await readySite(slug);
  if (!site || !isEngineBuilt(site.generator_version)) return null;
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!base) return null;

  const encodedPath = path.split("/").map(encodeURIComponent).join("/");
  const res = await fetch(
    `${base}/storage/v1/object/public/demo-dist/${encodeURIComponent(slug)}/${encodedPath}`,
    { cache: "no-store" },
  );
  if (!res.ok || !res.body) return null;

  const headers = new Headers();
  const contentType = res.headers.get("content-type");
  const contentLength = res.headers.get("content-length");
  if (contentType) headers.set("Content-Type", contentType);
  if (contentLength) headers.set("Content-Length", contentLength);
  headers.set("Cache-Control", "public, max-age=31536000, immutable");
  headers.set("X-Content-Type-Options", "nosniff");
  return new NextResponse(res.body, { status: 200, headers });
}

async function recordView(demoSlug: string, publicSlug: string, request: NextRequest) {
  const url = new URL(request.url);
  if (url.searchParams.get("admin") === "1") return;
  const supabase = createServiceRoleClient();
  const src = url.searchParams.get("src");
  const now = new Date().toISOString();
  const { data: lead } = await supabase
    .from("leads")
    .select("id, business_name, city, demo_viewed_at, email_clicked_at, acquisition_channel")
    .eq("demo_slug", demoSlug)
    .maybeSingle();
  if (!lead) return;

  // The first time a business opens the site we built them is the first real
  // evidence any of this works, so it is worth interrupting someone for.
  // Only the first time: a visitor reading four pages must not send four
  // messages, and someone who returns next week should not either.
  const isFirstView = !lead.demo_viewed_at;

  const channel = src === "postcard" ? "postcard" : "email";
  const patch: Record<string, string> = {};
  if (!lead.demo_viewed_at) patch.demo_viewed_at = now;
  if (src && !lead.acquisition_channel) patch.acquisition_channel = src;
  const isFromOutreach = Boolean(src);
  if (isFromOutreach && !lead.email_clicked_at) patch.email_clicked_at = now;
  if (Object.keys(patch).length) await supabase.from("leads").update(patch).eq("id", lead.id);
  await supabase.from("outreach_events").insert([
    ...(isFromOutreach ? [{ lead_id: lead.id, channel, event_type: "clicked" }] : []),
    { lead_id: lead.id, channel, event_type: "viewed" },
  ]);
  if (isFromOutreach) {
    await supabase
      .from("lead_email_state")
      .update({ status: "clicked", last_event_at: now, updated_at: now })
      .eq("lead_id", lead.id)
      .eq("status", "active");
  }

  if (isFirstView) {
    try {
      const { alert } = await import("@/lib/telegram");
      const who = [lead.business_name, lead.city].filter(Boolean).join(" · ");
      const site = process.env.NEXT_PUBLIC_URL ?? "https://www.buildittoday.ai";
      await alert(
        "viewed",
        `${lead.business_name ?? "A lead"} opened their site`,
        [
          who,
          isFromOutreach
            ? `Came from the ${channel} — they clicked the link.`
            : "Arrived directly, without using the link we sent.",
          `${site}/${publicSlug}`,
        ].join("\n"),
      );
    } catch {
      // Never let a notification cost somebody their page. This runs inside a
      // request that is already serving HTML.
    }
  }
}

export function notFoundPage(): NextResponse {
  return new NextResponse(
    `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Page not found · BuildItToday.ai</title><meta name="robots" content="noindex,nofollow"><style>body{margin:0;background:#fff;color:#171717;min-height:100vh;display:flex;align-items:center;justify-content:center;font-family:system-ui,-apple-system,"Segoe UI",sans-serif}.w{max-width:32rem;padding:0 1.5rem;text-align:center}.k{font-size:.8rem;letter-spacing:.14em;text-transform:uppercase;color:#737373;margin:0}h1{font-size:1.9rem;font-weight:600;margin:.75rem 0 0;letter-spacing:-.01em}p{color:#525252;line-height:1.6;margin:1rem 0 0}.a{display:inline-flex;align-items:center;height:2.75rem;padding:0 1.5rem;margin-top:2rem;border-radius:.5rem;background:#171717;color:#fff;text-decoration:none;font-size:.875rem;font-weight:500}</style></head><body><div class="w"><p class="k">404</p><h1>That page doesn&rsquo;t exist</h1><p>The link may be out of date, or the address slightly off. Nothing is broken on your end.</p><a class="a" href="/">Go to the homepage</a></div></body></html>`,
    { status: 404, headers: { "Content-Type": "text/html; charset=utf-8", "X-Robots-Tag": "noindex, nofollow" } },
  );
}

function unavailablePage(): NextResponse {
  return new NextResponse("The website is temporarily unavailable.", { status: 503, headers: { "Retry-After": "60" } });
}
