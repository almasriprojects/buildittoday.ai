import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

// Port of AS02 — Classify The Business
// Two modes:
//   default: batch-classify leads where target_fit IS NULL (unchanged)
//   { reclassifyCategory, reclassifyTargetFit }: re-run classification against
//     an already-classified subset (used once to fix the Real Estate
//     Investment over-exclusion — it was sweeping in active real-estate
//     service businesses alongside genuinely passive single-property holders)

const BATCH_SIZE = 20;
/**
 * Wall-clock budget for one invocation.
 *
 * This was 120s against a 150s platform ceiling, which left no room: a slow
 * model call late in the loop ran the worker into WORKER_RESOURCE_LIMIT and it
 * was killed before it could flush its logs or return what it had already
 * done.
 *
 * The budget is checked before a batch starts, not during one, so the real
 * ceiling is this value plus one batch. With reasoning off a batch of twenty
 * takes about 23 seconds, so 75s gives three batches in a typical run and
 * still lands near 125s even if a batch runs twice its usual length.
 *
 * Sixty leads a run, ninety-six runs a day, against a scraper bringing in
 * roughly 2,450 — comfortably ahead, which it was not before.
 */
const TIME_BUDGET_MS = 75_000;

/**
 * Output budget, and why it is this large.
 *
 * This was 2000, against a batch of 25. Twenty-five classification objects are
 * roughly 900 tokens on their own, which left very little headroom — and on
 * 11 Sep every single call started coming back with finish_reason "length".
 * The array was cut off mid-object, JSON.parse threw, and the function
 * returned a generic "Failed to parse model response" that named neither the
 * truncation nor the cause. 2,420 leads went unclassified in a day.
 *
 * OpenRouter routes this model across providers run to run (DigitalOcean and
 * OpenInference both appear in the logs). A provider that emits reasoning
 * tokens spends them from this same budget before the answer begins, so the
 * ceiling has to cover thinking as well as output. Tokens are billed as used,
 * not as reserved, so a generous cap costs nothing on a batch that behaves.
 */
const MAX_TOKENS = 8000;

const SYSTEM_PROMPT = `You classify newly-registered Florida business names for a web-design outreach campaign. For each business name, determine:

1. category — one of: "Home & Trade Services" (plumbing, electrical, HVAC, cleaning, landscaping, construction, auto repair, handyman), "Professional Services" (legal, accounting, consulting, insurance, real estate agency), "Retail & E-commerce", "Food & Beverage", "Health & Wellness" (salons, fitness, medical practices), "Creative & Marketing", "Real Estate Investment" (PASSIVE single-property holding/rental entities ONLY — the name is just a street address, or "___ Holdings LLC" / "___ Land Holding LLC" with no other signal, or an institutional/REIT-style numbered portfolio entity — these own property but serve no outside customers), "Real Estate Services" (ACTIVE, client-facing real estate businesses: property management companies that manage properties for clients, home-buying/wholesaling firms ("we buy houses" style investors), land developers who build and sell, real estate investment GROUPS or FIRMS that market to clients or investors — these have customers and want a website), "Financial Vehicle" (investment/fund entities), "Non-Profit", "Unclear" (name gives no signal of business type).

When a name contains "real estate," "property," "holdings," "land," "residential," "rental," or similar: look specifically for a signal of an ACTIVE, CLIENT-FACING business (property manager, "we buy houses"/investor, developer, investment GROUP/FIRM) vs a PASSIVE single-property holder (name is just a street address, "___ Holdings LLC" alone with nothing else, or a numbered/institutional portfolio entity). Only the passive kind is "Real Estate Investment" — everything with active service/client signals is "Real Estate Services".

2. target_fit — "yes" if this looks like an operating small business that would plausibly want a professional website (any category except Real Estate Investment [passive], Financial Vehicle, or Unclear — "Real Estate Services" DOES count as a "yes" candidate like any other operating business), "maybe" if genuinely ambiguous, "no" if it reads as a passive/non-operating entity.

3. reason — under 8 words, why you classified it this way.

Respond with ONLY a JSON array, no prose before or after, in this exact shape:
[{"index":0,"category":"...","target_fit":"yes","reason":"..."}, ...]

One object per business name listed, using the same index numbers given.

Do not explain your reasoning outside the JSON. Keep every "reason" under 8 words — long reasons are what push the response past its length limit and lose the whole batch.`;

/**
 * Pull the classification array out of whatever the model actually returned.
 *
 * Three shapes have to survive here, in order of preference:
 *   1. clean JSON, possibly inside a ```json fence
 *   2. JSON with prose around it — sliced from the first [ to the last ]
 *   3. a TRUNCATED array, where the closing bracket never arrived — the
 *      complete objects are salvaged individually
 *
 * The third case is the one that mattered. A truncated response used to throw
 * away the entire batch and return 502, so a run that had correctly classified
 * nineteen businesses recorded none of them.
 */
function extractClassifications(raw: string): { rows: unknown[]; salvaged: boolean } {
  const text = raw.trim()
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/```\s*$/i, "")
    .trim();

  try {
    const parsed = JSON.parse(text);
    if (Array.isArray(parsed)) return { rows: parsed, salvaged: false };
  } catch { /* fall through */ }

  const start = text.indexOf("[");
  const end = text.lastIndexOf("]");
  if (start !== -1 && end > start) {
    try {
      const parsed = JSON.parse(text.slice(start, end + 1));
      if (Array.isArray(parsed)) return { rows: parsed, salvaged: false };
    } catch { /* fall through to salvage */ }
  }

  // Salvage: every complete {...} object, ignoring the half-written tail.
  const rows: unknown[] = [];
  for (const m of text.matchAll(/\{[^{}]*\}/g)) {
    try {
      rows.push(JSON.parse(m[0]));
    } catch { /* skip the fragment */ }
  }
  return { rows, salvaged: rows.length > 0 };
}

Deno.serve(async (req: Request) => {
  const runId = crypto.randomUUID().slice(0, 8);
  const startedAt = Date.now();
  console.log(`[${runId}] classify-leads starting`);

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );
  const openrouterKey = Deno.env.get("OPENROUTER_API_KEY");
  if (!openrouterKey) {
    console.error(`[${runId}] OPENROUTER_API_KEY not set`);
    return new Response(JSON.stringify({ ok: false, error: "OPENROUTER_API_KEY not set" }), { status: 500 });
  }

  let reclassifyCategory: string | null = null;
  let reclassifyTargetFit: string | null = null;
  let afterId: string | null = null;
  // Hard ceiling on batches, independent of the clock. Lets a run be bounded
  // for testing, and guarantees an invocation always returns.
  let maxBatches = 50;
  try {
    const body = await req.json();
    if (Number.isFinite(body?.maxBatches) && body.maxBatches > 0) {
      maxBatches = Math.min(Number(body.maxBatches), 50);
    }
    if (typeof body?.reclassifyCategory === "string" && body.reclassifyCategory.length > 0) {
      reclassifyCategory = body.reclassifyCategory;
    }
    if (typeof body?.reclassifyTargetFit === "string" && body.reclassifyTargetFit.length > 0) {
      reclassifyTargetFit = body.reclassifyTargetFit;
    }
    if (typeof body?.afterId === "string" && body.afterId.length > 0) {
      afterId = body.afterId;
    }
  } catch { /* no body — default mode */ }
  const reclassifyMode = reclassifyCategory !== null && reclassifyTargetFit !== null;
  console.log(`[${runId}] mode=${reclassifyMode ? `reclassify(${reclassifyCategory}, ${reclassifyTargetFit}, afterId=${afterId})` : "default (target_fit IS NULL)"}`);

  let totalClassified = 0;
  let batches = 0;
  let truncatedBatches = 0;
  // In reclassify mode, a lead that gets re-confirmed (same category/target_fit)
  // still matches the filter on the next fetch, so plain re-querying can loop
  // over the same already-processed rows forever without covering the rest.
  // Track a cursor (ordered by id) so each fetch — within this invocation and
  // across repeated calls via the returned lastId — only reaches new rows.
  let cursor = afterId;

  while (Date.now() - startedAt < TIME_BUDGET_MS && batches < maxBatches) {
    let query = supabase.from("leads").select("id, business_name");
    if (reclassifyMode) {
      query = query.eq("business_category", reclassifyCategory!).eq("target_fit", reclassifyTargetFit!);
      if (cursor) query = query.gt("id", cursor);
      query = query.order("id", { ascending: true });
    } else {
      query = query.is("target_fit", null);
    }
    const { data: leads, error: fetchError } = await query.limit(BATCH_SIZE);
    if (fetchError) {
      console.error(`[${runId}] fetch failed: ${fetchError.message}`);
      throw fetchError;
    }
    if (!leads || leads.length === 0) {
      console.log(`[${runId}] no more matching leads, stopping after ${batches} batches`);
      break;
    }
    if (reclassifyMode) {
      cursor = leads[leads.length - 1].id as string;
    }

    console.log(`[${runId}] batch ${batches + 1}: fetched ${leads.length} leads`);
    const indexMap = leads.map((l, i) => ({ index: i, id: l.id, business_name: l.business_name }));
    const nameList = indexMap.map((m) => `${m.index}. ${m.business_name}`).join("\n");

    const resp = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${openrouterKey}`,
        "HTTP-Referer": "https://buildittoday.ai",
        "X-Title": "AutoSite Lead Classification",
      },
      body: JSON.stringify({
        model: "deepseek/deepseek-v4-flash-0731",
        max_tokens: MAX_TOKENS,
        // No thinking, please.
        //
        // This model reasons by default, and the reasoning is charged against
        // the same max_tokens budget as the answer — which is what truncated
        // every response on 11 Sep. It is also what made a batch of twenty
        // take ninety-seven seconds, slow enough that the schedule could never
        // keep up with the scraper. Sorting a business name into one of ten
        // categories does not need a chain of thought.
        reasoning: { enabled: false },
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: nameList },
        ],
      }),
    });

    if (!resp.ok) {
      const errText = await resp.text();
      console.error(`[${runId}] OpenRouter ${resp.status}: ${errText.slice(0, 300)}`);
      return new Response(JSON.stringify({ ok: false, error: `OpenRouter ${resp.status}: ${errText}`, batchesCompleted: batches }), { status: 502 });
    }

    const json = await resp.json();
    const choice = json?.choices?.[0];
    const finishReason: string | undefined = choice?.finish_reason;
    const content: string = choice?.message?.content ?? "";

    const { rows: classifications, salvaged } = extractClassifications(content);

    // Say what actually went wrong.
    //
    // The old code returned "Failed to parse model response" for every
    // failure, so a truncated answer, an empty answer and malformed JSON all
    // looked identical from the outside. That is why this ran broken for a
    // full day while the Agents page showed it green.
    if (classifications.length === 0) {
      const why = finishReason === "length"
        ? `model hit the ${MAX_TOKENS}-token ceiling and returned nothing parseable ` +
          `(finish_reason=length). Lower BATCH_SIZE or raise MAX_TOKENS.`
        : `could not parse a classification array (finish_reason=${finishReason ?? "unknown"}, ` +
          `content length ${content.length})`;
      console.error(`[${runId}] ${why}: ${JSON.stringify(json).slice(0, 600)}`);
      return new Response(
        JSON.stringify({ ok: false, error: why, finishReason, batchesCompleted: batches, leadsClassified: totalClassified }),
        { status: 502 },
      );
    }

    if (salvaged || finishReason === "length") {
      truncatedBatches++;
      console.warn(
        `[${runId}] batch ${batches + 1} was truncated (finish_reason=${finishReason}); ` +
        `salvaged ${classifications.length} of ${leads.length}. The rest stay unclassified and ` +
        `will be picked up on the next run.`,
      );
    }

    let batchClassified = 0;
    for (const c of classifications as { index?: number; category?: string; target_fit?: string; reason?: string }[]) {
      const match = indexMap.find((m) => m.index === c.index);
      if (!match) continue;
      if (!c.category || !c.target_fit) continue;
      const { error: updateError } = await supabase
        .from("leads")
        .update({
          business_category: c.category,
          target_fit: c.target_fit,
          classification_reason: c.reason,
        })
        .eq("id", match.id);
      if (!updateError) { totalClassified++; batchClassified++; }
      else console.error(`[${runId}] update failed for lead ${match.id}: ${updateError.message}`);
    }
    console.log(`[${runId}] batch ${batches + 1}: classified ${batchClassified}/${leads.length}`);

    // A batch that classified nobody would otherwise spin here until the time
    // budget ran out, re-fetching the same rows and paying for them each time.
    if (batchClassified === 0 && !reclassifyMode) {
      console.error(`[${runId}] batch ${batches + 1} classified none of ${leads.length}; stopping rather than looping`);
      return new Response(
        JSON.stringify({ ok: false, error: "A batch returned classifications that matched no leads", batchesCompleted: batches, leadsClassified: totalClassified }),
        { status: 502 },
      );
    }

    batches++;
  }

  console.log(`[${runId}] done: batches=${batches} classified=${totalClassified} truncated=${truncatedBatches} elapsedMs=${Date.now() - startedAt} lastId=${cursor}`);
  return new Response(
    JSON.stringify({
      ok: true,
      mode: reclassifyMode ? "reclassify" : "default",
      batchesCompleted: batches,
      leadsClassified: totalClassified,
      truncatedBatches,
      elapsedMs: Date.now() - startedAt,
      lastId: cursor,
    }),
    { headers: { "Content-Type": "application/json" } },
  );
});
