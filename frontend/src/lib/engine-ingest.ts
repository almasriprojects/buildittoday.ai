import { createServiceRoleClient } from "@/lib/supabase";

/**
 * Taking a finished build from the site-generator engine and publishing it.
 *
 * The old generator produced one HTML file, and `demo_sites.storage_path`
 * pointed straight at it. An engine build is a Vite dist — around 50 files and
 * 3 MB, hashed JS and CSS, subset fonts, webp imagery, and mp4 + webm for a
 * video hero. So this uploads a tree and records the prefix rather than a file.
 *
 * Two things are deliberately dropped on the way in, and neither is cosmetic:
 * `robots.txt` and `sitemap.xml`. The engine emits them pointing at wherever
 * the site will live, which for a demo means inviting Google to index a site
 * built from public records for a business that has never been contacted —
 * competing with their real site under their own name. The build is already
 * asked for with `indexable: false`, so they should be absent; stripping them
 * here as well means a build made without that flag still cannot leak.
 */

/** Bucket for engine builds. Separate from `demo-sites`, which holds the
 *  single-file output of the old generator for the 45 legacy sites. */
export const DIST_BUCKET = "demo-dist";

/** Marks a record as engine-built. `site-gate.ts` reads this to skip its own
 *  gate, which was written for server-rendered HTML and rejects every SPA. */
export const GENERATOR_VERSION = "engine-1";

/** Never uploaded — see the note above. */
const NEVER_UPLOAD = new Set(["robots.txt", "sitemap.xml"]);

/** Content types Supabase will not infer correctly on its own. Serving a .js
 *  as application/octet-stream makes the browser refuse to execute it, and the
 *  page renders as a blank shell with no error worth reading. */
const MIME: Record<string, string> = {
  html: "text/html; charset=utf-8",
  js: "text/javascript; charset=utf-8",
  mjs: "text/javascript; charset=utf-8",
  css: "text/css; charset=utf-8",
  json: "application/json",
  svg: "image/svg+xml",
  webp: "image/webp",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  ico: "image/x-icon",
  woff: "font/woff",
  woff2: "font/woff2",
  ttf: "font/ttf",
  mp4: "video/mp4",
  webm: "video/webm",
  txt: "text/plain; charset=utf-8",
  xml: "application/xml",
};

export function contentTypeFor(path: string): string {
  const ext = path.split(".").pop()?.toLowerCase() ?? "";
  return MIME[ext] ?? "application/octet-stream";
}

export type DistFile = { path: string; body: Uint8Array };

export type IngestResult = {
  slug: string;
  uploaded: number;
  skipped: string[];
  bytes: number;
  prefix: string;
};

/**
 * Upload one build.
 *
 * `slug` is the public slug the site is served at, and doubles as the storage
 * prefix, so `/{slug}/assets/x.js` maps to `demo-dist/{slug}/assets/x.js` with
 * no translation table to get out of step.
 */
export async function uploadDist(
  slug: string,
  files: DistFile[],
): Promise<IngestResult> {
  const supabase = createServiceRoleClient();
  const skipped: string[] = [];
  let uploaded = 0;
  let bytes = 0;

  // index.html must exist or there is no site, only assets.
  if (!files.some((f) => f.path === "index.html")) {
    throw new Error(`${slug}: build has no index.html`);
  }

  for (const file of files) {
    if (NEVER_UPLOAD.has(file.path)) {
      skipped.push(file.path);
      continue;
    }
    const { error } = await supabase.storage
      .from(DIST_BUCKET)
      .upload(`${slug}/${file.path}`, file.body, {
        contentType: contentTypeFor(file.path),
        upsert: true,
      });
    if (error) {
      throw new Error(`${slug}: uploading ${file.path} failed — ${error.message}`);
    }
    uploaded++;
    bytes += file.body.byteLength;
  }

  return { slug, uploaded, skipped, bytes, prefix: `${slug}/` };
}

/**
 * Remove a previously uploaded build.
 *
 * Used when replacing one: the old files are hashed, so leaving them costs
 * storage forever and nothing ever references them again.
 */
export async function removeDist(slug: string): Promise<number> {
  const supabase = createServiceRoleClient();
  let removed = 0;

  // list() is per-directory, so the tree is walked rather than globbed.
  const walk = async (prefix: string): Promise<string[]> => {
    const { data } = await supabase.storage.from(DIST_BUCKET).list(prefix, { limit: 1000 });
    const out: string[] = [];
    for (const entry of data ?? []) {
      const full = `${prefix}/${entry.name}`;
      // A directory has no id; a file does.
      if (entry.id === null) out.push(...(await walk(full)));
      else out.push(full);
    }
    return out;
  };

  const paths = await walk(slug);
  if (paths.length) {
    const { error } = await supabase.storage.from(DIST_BUCKET).remove(paths);
    if (!error) removed = paths.length;
  }
  return removed;
}

/**
 * Fetch the served HTML for a slug.
 *
 * Kept here rather than in the route so the ingest and the serve agree on
 * where a build lives.
 */
export async function fetchDistIndex(slug: string): Promise<string | null> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const res = await fetch(
    `${url}/storage/v1/object/public/${DIST_BUCKET}/${slug}/index.html`,
    { cache: "no-store" },
  );
  return res.ok ? res.text() : null;
}

/**
 * Make a build servable at `/{slug}` — a URL with no trailing slash, because
 * that is the address that goes in an outreach email.
 *
 * The engine builds with vite's `base: "./"`, so every asset reference is
 * relative and resolves against the document URL. At `/{slug}/services` that
 * is already correct, but at `/{slug}` the browser resolves `./assets/x.js` to
 * `/assets/x.js` and the page loads nothing.
 *
 * A `<base>` tag fixes precisely that and nothing else: the SPA's own router
 * reads `window.location.pathname` and navigates with pushState, and every
 * link it renders is root-absolute, so none of them are affected. Neither are
 * the offer layer's, which are all `/api/...`, `/#book`, `mailto:` or `tel:`.
 */
export function withBaseHref(html: string, slug: string): string {
  const base = `<base href="/${slug}/">`;
  if (/<base\s/i.test(html)) return html;
  return /<head[^>]*>/i.test(html)
    ? html.replace(/<head([^>]*)>/i, `<head$1>${base}`)
    : `${base}${html}`;
}
