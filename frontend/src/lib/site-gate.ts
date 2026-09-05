import { createServiceRoleClient } from "@/lib/supabase";

/**
 * The quality gate that replaces reviewing every site by hand.
 *
 * Reviewing 43 sites was possible. Reviewing 895 is not, and the backlog grows
 * daily — so a human bottleneck here does not scale and has already held the
 * business up for weeks.
 *
 * What a person was actually checking is mechanical: does it have a hero video,
 * do the images load, is there placeholder text, does it mention the business.
 * That is exactly what this runs, and it found zero defects across all 43.
 *
 * Two things it deliberately keeps a human for:
 *
 *   1. The first HOLD_FIRST sites are never auto-approved. Not because the
 *      checks are weak, but because you should see what goes out under your
 *      name before it goes out at volume.
 *   2. After that, roughly one in SPOT_CHECK_RATE is held anyway. Automated
 *      gates drift — the generator changes, a model updates, and everything
 *      still "passes" while quietly getting worse. A trickle of human eyes is
 *      how that gets noticed before a customer notices it.
 */

const SITE = process.env.NEXT_PUBLIC_URL ?? "https://www.buildittoday.ai";

/** Sites that must be eyeballed before automation takes over. */
/**
 * Sites built by the site-generator engine carry this prefix in
 * `generator_version`, and this gate must not touch them.
 *
 * `judge()` reads the raw HTML: it counts words, and requires a <video> tag
 * and at least two <img> tags. That works on the server-rendered pages the old
 * generator produced. An engine build is a client-rendered React SPA, so the
 * initial HTML is a shell — measured against a real one: 3 words, no <video>,
 * no <img>. Every engine site would be rejected as "too thin; no hero video".
 *
 * They are not ungated. The engine runs 21 rendered-DOM checks that subsume
 * every one of these and test them properly, against the DOM after JavaScript
 * has run, and it refuses to publish a build that fails. That verdict travels
 * with the site; re-judging it here with a weaker instrument could only ever
 * produce a false rejection.
 */
const ENGINE_PREFIX = "engine";

export function isEngineBuilt(generatorVersion: string | null | undefined): boolean {
  return (generatorVersion ?? "").trim().toLowerCase().startsWith(ENGINE_PREFIX);
}

const HOLD_FIRST = 10;
/** Roughly one in this many is held for review afterwards. */
const SPOT_CHECK_RATE = 20;

/** Below this a page is too thin to send, whatever else passes. */
const MIN_WORDS = 180;
/** Between MIN_WORDS and this it is sendable but a human should glance. */
const THIN_WORDS = 300;

const PLACEHOLDER =
  /\{\{|\}\}|lorem ipsum|\[insert|\bTODO\b|PLACEHOLDER|your business name|business name here/i;

export type Verdict = {
  slug: string;
  business: string;
  decision: "approved" | "needs_regen" | "pending";
  reasons: string[];
  words: number;
};

/**
 * Judge one built site. Never throws — a checker that crashes must not be able
 * to approve something by accident.
 */
export async function judge(demoSlug: string, publicSlug: string, business: string): Promise<Verdict> {
  const v: Verdict = { slug: demoSlug, business, decision: "approved", reasons: [], words: 0 };
  const fail = (r: string) => { v.reasons.push(r); v.decision = "needs_regen"; };
  const hold = (r: string) => {
    v.reasons.push(r);
    if (v.decision === "approved") v.decision = "pending";
  };

  let html: string;
  try {
    // ?admin=1 so the sales layer is not counted as the site's own content.
    const res = await fetch(`${SITE}/${publicSlug}?admin=1`, { cache: "no-store" });
    if (!res.ok) { fail(`page returned HTTP ${res.status}`); return v; }
    html = await res.text();
  } catch (e) {
    fail(`page did not load (${e instanceof Error ? e.name : "error"})`);
    return v;
  }

  const text = html
    .replace(/<(script|style)[^>]*>[\s\S]*?<\/\1>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  v.words = text ? text.split(" ").length : 0;

  if (!/<video[\s>]/i.test(html)) fail("no hero video");

  const imgs = html.match(/<img[^>]+src="([^"]+)"/gi) ?? [];
  if (imgs.length < 2) hold(`only ${imgs.length} image(s)`);

  if (PLACEHOLDER.test(text)) fail("unfilled placeholder text");

  if (v.words < MIN_WORDS) fail(`too thin — ${v.words} words`);
  else if (v.words < THIN_WORDS) hold(`thin — ${v.words} words`);

  if (!/<title[^>]*>[^<]{5,}/i.test(html)) fail("no page title");

  // Is the page actually about this business?
  const distinct = business
    .toLowerCase()
    .replace(/[^a-z ]/g, "")
    .split(/\s+/)
    .filter((w) => w.length > 3 && !["llc", "inc", "corp", "company", "the", "and"].includes(w));
  if (distinct.length && !distinct.some((w) => text.toLowerCase().includes(w))) {
    fail("business name never appears in the copy");
  }

  // Do the assets actually resolve? A broken hero is worse than no hero.
  const assets = [
    ...(html.match(/<source[^>]+src="([^"]+)"/i) ? [RegExp.$1] : []),
    ...imgs.slice(0, 2).map((t) => (t.match(/src="([^"]+)"/) ?? [])[1]).filter(Boolean),
  ] as string[];

  for (const a of assets) {
    if (!a || a.startsWith("data:")) continue;
    const url = a.startsWith("http") ? a : `${SITE}${a}`;
    try {
      const head = await fetch(url, { method: "HEAD", cache: "no-store" });
      if (!head.ok) fail(`broken asset: ${a.split("/").pop()}`);
    } catch {
      fail(`unreachable asset: ${a.split("/").pop()}`);
    }
  }

  return v;
}

export type GateResult = {
  checked: number;
  approved: number;
  heldForReview: number;
  rejected: number;
  verdicts: Verdict[];
  reviewedSoFar: number;
};

/**
 * Judge every site still awaiting review and record the decision.
 * Safe to run repeatedly — it only ever looks at pending sites.
 */
export async function runGate(opts: { dryRun?: boolean; limit?: number } = {}): Promise<GateResult> {
  const supabase = createServiceRoleClient();

  // How many have already been decided by a person or by a previous run. This
  // is what makes the first HOLD_FIRST genuinely the first.
  const { count: decided } = await supabase
    .from("demo_sites")
    .select("*", { count: "exact", head: true })
    .neq("review_status", "pending");

  const reviewedSoFar = decided ?? 0;

  const { data: pending } = await supabase
    .from("demo_sites")
    .select("demo_slug, public_slug, business_name, generator_version")
    .eq("status", "ready")
    .eq("review_status", "pending")
    .order("created_at", { ascending: true })
    .limit(opts.limit ?? 50);

  const out: GateResult = {
    checked: 0, approved: 0, heldForReview: 0, rejected: 0,
    verdicts: [], reviewedSoFar,
  };

  for (const [i, site] of (pending ?? []).entries()) {
    if (!site.public_slug) continue;

    // Already gated by the engine, and by a stricter instrument than this one.
    // Judging it here would reject it for being a single-page app.
    if (isEngineBuilt(site.generator_version)) continue;

    const v = await judge(site.demo_slug, site.public_slug, site.business_name ?? "");
    out.checked++;

    // Hold the opening batch, and a sample thereafter, regardless of verdict.
    const position = reviewedSoFar + i;
    const withinFirst = position < HOLD_FIRST;
    const spotCheck = !withinFirst && Math.random() < 1 / SPOT_CHECK_RATE;

    if (v.decision === "approved" && (withinFirst || spotCheck)) {
      v.decision = "pending";
      v.reasons.push(withinFirst ? "held — among the first sites to go out" : "held — routine spot check");
    }

    out.verdicts.push(v);
    if (v.decision === "approved") out.approved++;
    else if (v.decision === "needs_regen") out.rejected++;
    else out.heldForReview++;

    if (!opts.dryRun && v.decision !== "pending") {
      await supabase
        .from("demo_sites")
        .update({
          review_status: v.decision,
          review_note: v.reasons.join("; ") || "passed automated checks",
          reviewed_at: new Date().toISOString(),
          reviewed_by: "quality-gate",
        })
        .eq("demo_slug", site.demo_slug);
    }
  }

  return out;
}
