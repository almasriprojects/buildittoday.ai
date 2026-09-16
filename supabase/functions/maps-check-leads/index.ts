import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

/**
 * maps-check-leads — is this business on Google, and does it already have a
 * site?
 *
 * Google is the only free source of a real business telephone number. The
 * state's daily file gives us the owner's name and home address and no way to
 * ring them; a Places listing gives us the number the owner published
 * themselves.
 *
 * The catch, and the reason this function was rewritten: a company cannot have
 * a listing before it opens, and we were asking on the day it registered.
 * Split by how old each business was when we looked:
 *
 *   searched 0-30 days after filing   21,870 leads    0.06% found
 *   searched 31-45 days               11,948 leads    9.32% found
 *   searched 46-60 days                  221 leads   11.31% found
 *
 * A miss already wrote a recheck_date. Nothing ever read it — the selector
 * asked only for maps_checked = false — so every one of those 21,870 leads was
 * searched once, at the worst possible moment, and written off.
 *
 * Now a lead is searched again once it has had time to exist, up to three
 * times, after which it is left alone so a business that will never be listed
 * cannot consume quota forever.
 */
const BATCH_SIZE = 20;
const TIME_BUDGET_MS = 110_000;
const MAX_CHECKS = 3;
/** A listing rarely appears before this; see the table above. */
const FIRST_LOOK_DAYS = 45;
/** Gaps between later attempts, in days. */
const BACKOFF_DAYS = [30, 60];
const STOPWORDS = new Set(["the", "and", "of", "for", "a", "an"]);

function normalize(name: string) {
  return (name || "")
    .replace(/\b(LLC|INC|CORP|CORPORATION|LP|LLP|PA|PLLC|LTD|CO)\b\.?/gi, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 1 && !STOPWORDS.has(w));
}

function nameMatchScore(ourName: string, googleName: string) {
  const ours = new Set(normalize(ourName));
  const theirs = new Set(normalize(googleName));
  if (ours.size === 0 || theirs.size === 0) return 0;
  let overlap = 0;
  for (const w of ours) if (theirs.has(w)) overlap++;
  return overlap / Math.min(ours.size, theirs.size);
}

function isoDate(d: Date) {
  return d.toISOString().split("T")[0];
}

/**
 * When to look again after a miss.
 *
 * Dated from the filing rather than from today, because what matters is how
 * old the business is, not when we happened to ask. Returns null once the
 * lead has had its three attempts.
 */
function nextRecheck(filingDate: string | null, checksSoFar: number): string | null {
  if (checksSoFar >= MAX_CHECKS) return null;
  const today = new Date();
  if (checksSoFar <= 1 && filingDate) {
    const first = new Date(filingDate + "T00:00:00Z");
    first.setDate(first.getDate() + FIRST_LOOK_DAYS);
    return isoDate(first > today ? first : today);
  }
  const gap = BACKOFF_DAYS[Math.min(checksSoFar - 1, BACKOFF_DAYS.length - 1)] ?? 60;
  today.setDate(today.getDate() + gap);
  return isoDate(today);
}

Deno.serve(async (req: Request) => {
  const runId = crypto.randomUUID().slice(0, 8);
  const startedAt = Date.now();
  console.log(`[${runId}] maps-check-leads starting`);

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );
  const mapsKey = Deno.env.get("GOOGLE_MAPS_API_KEY");
  if (!mapsKey) {
    console.error(`[${runId}] GOOGLE_MAPS_API_KEY not set`);
    return new Response(JSON.stringify({ ok: false, error: "GOOGLE_MAPS_API_KEY not set" }), { status: 500 });
  }

  // Explicit type check, not truthiness — 0 must mean "stop immediately",
  // not "unbounded" (see skip-trace-leads incident).
  let maxLeads = Infinity;
  let mode: "new" | "recheck" | "both" = "both";
  try {
    const body = await req.json();
    if (typeof body?.maxLeads === "number" && !Number.isNaN(body.maxLeads)) {
      maxLeads = body.maxLeads;
    }
    if (body?.mode === "new" || body?.mode === "recheck") mode = body.mode;
  } catch { /* no body is fine */ }
  console.log(`[${runId}] maxLeads=${maxLeads === Infinity ? "unbounded" : maxLeads} mode=${mode}`);
  if (maxLeads <= 0) {
    console.log(`[${runId}] maxLeads<=0, exiting without making any Maps calls`);
    return new Response(JSON.stringify({ ok: true, leadsProcessed: 0 }), { headers: { "Content-Type": "application/json" } });
  }

  const today = isoDate(new Date());
  let totalProcessed = 0;
  let newlyFound = 0;
  let rechecked = 0;
  let gaveUp = 0;

  /**
   * Fetch the next batch.
   *
   * Never-searched leads come first: a business registered today still has to
   * be recorded as looked-at so it enters the recheck cycle at all. Only when
   * that queue is empty does the run spend quota on second and third looks.
   */
  async function nextBatch(limit: number) {
    if (mode !== "recheck") {
      const { data, error } = await supabase
        .from("leads")
        .select("id, business_name, city, filing_date, maps_check_count")
        .eq("maps_checked", false)
        .limit(limit);
      if (error) throw error;
      if (data && data.length) return { rows: data, isRecheck: false };
      if (mode === "new") return { rows: [], isRecheck: false };
    }
    const { data, error } = await supabase
      .from("leads")
      .select("id, business_name, city, filing_date, maps_check_count")
      .eq("maps_checked", true)
      .neq("found_on_maps", true)
      .lt("maps_check_count", MAX_CHECKS)
      .not("recheck_date", "is", null)
      .lte("recheck_date", today)
      .order("recheck_date", { ascending: true })
      .limit(limit);
    if (error) throw error;
    return { rows: data ?? [], isRecheck: true };
  }

  outer: while (Date.now() - startedAt < TIME_BUDGET_MS && totalProcessed < maxLeads) {
    const batchSize = Math.min(BATCH_SIZE, maxLeads - totalProcessed);
    const { rows: leads, isRecheck } = await nextBatch(batchSize);
    if (!leads.length) {
      console.log(`[${runId}] nothing left to search (processed=${totalProcessed})`);
      break;
    }
    console.log(`[${runId}] batch: ${leads.length} leads (${isRecheck ? "recheck" : "first look"})`);

    for (const lead of leads) {
      if (Date.now() - startedAt > TIME_BUDGET_MS || totalProcessed >= maxLeads) {
        console.log(`[${runId}] stopping: time or maxLeads limit reached (processed=${totalProcessed})`);
        break outer;
      }

      const query = encodeURIComponent(`${lead.business_name} ${lead.city} FL`);
      const searchResp = await fetch(
        `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${query}&key=${mapsKey}`,
      );
      const searchJson = await searchResp.json();

      // Google reports failure in the body, not the HTTP status.
      //
      // REQUEST_DENIED, OVER_QUERY_LIMIT and INVALID_REQUEST all come back as
      // HTTP 200 with no results array. Read literally — which is what this
      // function used to do — that is indistinguishable from "this business
      // has no listing", and the lead gets written off as unfindable.
      //
      // Every Maps match in this database stops on 17 August, for businesses
      // filed in the same fortnight as ones matched days earlier. Nothing
      // about the businesses changed; the API started refusing us and nobody
      // was told.
      const apiStatus = searchJson.status as string | undefined;
      if (apiStatus && apiStatus !== "OK" && apiStatus !== "ZERO_RESULTS") {
        console.error(
          `[${runId}] Google Places says ${apiStatus}` +
          (searchJson.error_message ? `: ${searchJson.error_message}` : "") +
          " — abandoning the run rather than recording businesses as unlisted",
        );
        return new Response(JSON.stringify({
          ok: false,
          error: `Google Places ${apiStatus}`,
          detail: searchJson.error_message ?? null,
          leadsProcessedBeforeError: totalProcessed,
        }), { status: 502, headers: { "Content-Type": "application/json" } });
      }

      const rawMatch = searchJson.results?.[0] || null;
      const matchScore = rawMatch ? nameMatchScore(lead.business_name, rawMatch.name) : 0;
      const isValidMatch = matchScore >= 0.5;
      const topMatch = isValidMatch ? rawMatch : null;

      const checksSoFar = (lead.maps_check_count ?? 0) + 1;
      let update: Record<string, unknown>;

      if (!topMatch) {
        const next = nextRecheck(lead.filing_date as string | null, checksSoFar);
        if (next === null) gaveUp++;
        update = {
          maps_checked: true,
          found_on_maps: false,
          contact_status: "not_yet_indexed",
          maps_check_count: checksSoFar,
          recheck_date: next,
        };
        console.log(
          `[${runId}] lead ${lead.id}: no match (raw=${rawMatch ? rawMatch.name : "none"}, ` +
          `score=${matchScore.toFixed(2)}, look ${checksSoFar}/${MAX_CHECKS}, next=${next ?? "never"})`,
        );
      } else {
        const detailsResp = await fetch(
          `https://maps.googleapis.com/maps/api/place/details/json?place_id=${topMatch.place_id}&fields=formatted_phone_number,website,business_status&key=${mapsKey}`,
        );
        const detailsJson = await detailsResp.json();
        const details = detailsJson.result || {};
        const hasWebsite = !!details.website;
        const isClosed = details.business_status && details.business_status !== "OPERATIONAL";

        let contactStatus = "matched";
        if (hasWebsite) contactStatus = "already_has_website";
        else if (isClosed) contactStatus = "closed_per_google";
        else if (!details.formatted_phone_number) contactStatus = "no_phone_found";

        update = {
          maps_checked: true,
          found_on_maps: true,
          maps_phone: details.formatted_phone_number || "",
          maps_website: details.website || "",
          maps_business_status: details.business_status || topMatch.business_status || "",
          maps_rating: topMatch.rating ?? null,
          maps_review_count: topMatch.user_ratings_total || 0,
          maps_types: (topMatch.types || []).join(","),
          likely_established: (topMatch.user_ratings_total || 0) > 0,
          contact_status: contactStatus,
          maps_check_count: checksSoFar,
          // Found. Nothing more to look for.
          recheck_date: null,
        };
        newlyFound++;
        console.log(`[${runId}] lead ${lead.id}: matched "${topMatch.name}" (score=${matchScore.toFixed(2)}) -> ${contactStatus}`);
      }

      const { error: updateError } = await supabase.from("leads").update(update).eq("id", lead.id);
      if (updateError) {
        console.error(`[${runId}] update failed for lead ${lead.id}: ${updateError.message}`);
      } else {
        totalProcessed++;
        if (isRecheck) rechecked++;
      }
    }
    console.log(`[${runId}] batch done: totalProcessed=${totalProcessed}`);
  }

  console.log(
    `[${runId}] done: processed=${totalProcessed} found=${newlyFound} ` +
    `rechecks=${rechecked} gaveUp=${gaveUp} elapsedMs=${Date.now() - startedAt}`,
  );
  return new Response(
    JSON.stringify({
      ok: true, leadsProcessed: totalProcessed, newlyFound, rechecked, gaveUp,
      elapsedMs: Date.now() - startedAt,
    }),
    { headers: { "Content-Type": "application/json" } },
  );
});
