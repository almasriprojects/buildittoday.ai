import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

// Phase 2 — generates structured website content (not custom visual design;
// one shared template renders this). Supports two modes:
//   { leadId }            — generate for exactly one lead
//   { maxLeads: N }        — batch mode, picks up to N eligible leads
// maxLeads is hard-capped to respect edge function wall-clock limits and to
// keep OpenRouter spend bounded per invocation — call again for more.
//
// demo_slug = the lead's Sunbiz document_number (stable, unique, already
// assumed by /api/track/scan for postcard QR redirects).

const SYSTEM_PROMPT = `You write website content for small Florida businesses that don't have a website yet. You will be given a business name, its category, its city, and design/content principles for that category (researched from real top-performing websites in that industry).

Write content that is professional, specific to the inferred trade, and grounded ONLY in what can be reasonably inferred from the business name and category. NEVER invent specific unverifiable facts. This explicitly includes, but is not limited to:
- No claims of being "licensed", "insured", "bonded", "certified", "accredited", or holding any specific credential — we have not verified any of these and false claims here can be a legal liability for the business.
- No fake years-in-business claims ("10+ years of experience", "family-owned since...").
- No fabricated certifications, awards, association memberships, or partner/vendor badges.
- No invented client names, testimonial quotes, or review counts/ratings.
- No specific numeric stats you cannot know (number of projects completed, customers served, etc).

It is fine to describe services offered, general professionalism, and value proposition in qualitative terms (e.g. "quality craftsmanship", "responsive service", "clear communication") — just never state a specific verifiable credential or fact as though it were confirmed.

Respond with ONLY a JSON object, no prose before or after, in this exact shape:
{
  "tagline": "short punchy tagline, under 8 words",
  "hero": { "headline": "...", "subheadline": "1-2 sentences", "cta_text": "e.g. Get a Free Quote" },
  "about": { "heading": "...", "body": "2-3 sentences, no fabricated history" },
  "services": [ { "title": "...", "description": "1 sentence" } ],
  "why_choose_us": ["3-4 short bullet points, no credential claims"],
  "contact_cta": { "heading": "...", "body": "1 sentence", "button_text": "..." }
}
"services" should have 3-5 items appropriate to the specific trade implied by the business name (e.g. a construction company gets construction-specific services, not generic placeholders).`;

const MAX_LEADS_HARD_CAP = 25;

interface LeadRow {
  id: string;
  business_name: string;
  business_category: string | null;
  city: string | null;
  state: string | null;
  document_number: string | null;
}

async function generateForLead(
  lead: LeadRow,
  supabase: ReturnType<typeof createClient>,
  openrouterKey: string,
  runId: string,
): Promise<{ leadId: string; business_name: string; ok: boolean; demoSlug?: string; error?: string }> {
  const { data: designRef } = await supabase
    .from("category_design_references")
    .select("design_principles")
    .eq("business_category", lead.business_category)
    .maybeSingle();

  const userPrompt = `Business name: ${lead.business_name}
Category: ${lead.business_category || "Unclear"}
City: ${lead.city}, ${lead.state}

Design/content principles researched for this category:
${designRef?.design_principles || "(none available — use general small-business best practices)"}`;

  const resp = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${openrouterKey}`,
      "HTTP-Referer": "https://buildittoday.ai",
      "X-Title": "AutoSite Site Generation",
    },
    body: JSON.stringify({
      model: "deepseek/deepseek-v4-flash-0731",
      max_tokens: 2000,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userPrompt },
      ],
    }),
  });

  if (!resp.ok) {
    const errText = await resp.text();
    console.error(`[${runId}] ${lead.id} OpenRouter ${resp.status}: ${errText.slice(0, 300)}`);
    return { leadId: lead.id, business_name: lead.business_name, ok: false, error: `OpenRouter ${resp.status}` };
  }

  const json = await resp.json();
  let content: unknown;
  try {
    const raw = json.choices[0].message.content.trim();
    const cleaned = raw.replace(/^```json\s*/i, "").replace(/```\s*$/i, "");
    content = JSON.parse(cleaned);
  } catch {
    console.error(`[${runId}] ${lead.id} failed to parse model response: ${JSON.stringify(json).slice(0, 500)}`);
    return { leadId: lead.id, business_name: lead.business_name, ok: false, error: "Failed to parse model response" };
  }

  if (!lead.document_number) {
    console.error(`[${runId}] ${lead.id} has no document_number, cannot assign demo_slug`);
    return { leadId: lead.id, business_name: lead.business_name, ok: false, error: "Lead has no document_number" };
  }
  const demoSlug = lead.document_number;

  const { error: updateError } = await supabase
    .from("leads")
    .update({
      site_generated: true,
      site_generated_at: new Date().toISOString(),
      demo_slug: demoSlug,
      generated_content: content,
    })
    .eq("id", lead.id);

  if (updateError) {
    console.error(`[${runId}] ${lead.id} update failed: ${updateError.message}`);
    return { leadId: lead.id, business_name: lead.business_name, ok: false, error: updateError.message };
  }

  console.log(`[${runId}] ${lead.id} done: demo_slug=${demoSlug}`);
  return { leadId: lead.id, business_name: lead.business_name, ok: true, demoSlug };
}

Deno.serve(async (req: Request) => {
  const runId = crypto.randomUUID().slice(0, 8);
  console.log(`[${runId}] generate-site starting`);

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );
  const openrouterKey = Deno.env.get("OPENROUTER_API_KEY");
  if (!openrouterKey) {
    console.error(`[${runId}] OPENROUTER_API_KEY not set`);
    return new Response(JSON.stringify({ ok: false, error: "OPENROUTER_API_KEY not set" }), { status: 500 });
  }

  let leadId: string | null = null;
  let maxLeads: number | null = null;
  try {
    const body = await req.json();
    if (typeof body?.leadId === "string" && body.leadId.length > 0) {
      leadId = body.leadId;
    }
    if (typeof body?.maxLeads === "number" && Number.isFinite(body.maxLeads)) {
      maxLeads = body.maxLeads;
    }
  } catch { /* no body */ }

  if (!leadId && maxLeads === null) {
    console.error(`[${runId}] no leadId or maxLeads provided`);
    return new Response(
      JSON.stringify({ ok: false, error: "Provide either { leadId } for a single lead, or { maxLeads } for batch mode." }),
      { status: 400 },
    );
  }

  if (maxLeads !== null && (!Number.isInteger(maxLeads) || maxLeads <= 0)) {
    console.error(`[${runId}] invalid maxLeads=${maxLeads}`);
    return new Response(JSON.stringify({ ok: false, error: "maxLeads must be a positive integer" }), { status: 400 });
  }

  if (maxLeads !== null && maxLeads > MAX_LEADS_HARD_CAP) {
    console.error(`[${runId}] maxLeads=${maxLeads} exceeds hard cap ${MAX_LEADS_HARD_CAP}`);
    return new Response(
      JSON.stringify({
        ok: false,
        error: `maxLeads is capped at ${MAX_LEADS_HARD_CAP} per run to respect edge function time limits and control OpenRouter spend. Call again to process more.`,
      }),
      { status: 400 },
    );
  }

  let leads: LeadRow[] = [];

  if (leadId) {
    const { data: lead, error: leadError } = await supabase
      .from("leads")
      .select("id, business_name, business_category, city, state, document_number")
      .eq("id", leadId)
      .single();
    if (leadError || !lead) {
      console.error(`[${runId}] lead not found: ${leadError?.message}`);
      return new Response(JSON.stringify({ ok: false, error: "Lead not found" }), { status: 404 });
    }
    leads = [lead as LeadRow];
    console.log(`[${runId}] single-lead mode: ${lead.business_name}`);
  } else {
    // Hard filters: qualified, not already generated, and — critically — not
    // already showing signs of an existing website.
    //
    // Reachability now means we can reach THE OWNER, not merely that some
    // contact detail exists. The old test accepted any phone, email or mailing
    // address on the record, but those come from an address lookup that names
    // somebody other than the registered officer 71% of the time: a landlord,
    // an apartment company, once the Postal Service. A site built for one of
    // those costs $0.28 and can never be sent to anyone.
    //
    // Of the leads queued for copy, 751 are that kind against 360 we can
    // actually write to. Building in the order they happen to arrive spends
    // two of every three dollars on businesses we cannot contact.
    //
    // state_email needs no grade: it is the address the business filed with
    // Florida itself, so the question of who it belongs to does not arise.
    const { data: batch, error: batchError } = await supabase
      .from("leads")
      .select("id, business_name, business_category, city, state, document_number")
      .eq("target_fit", "yes")
      .eq("dataskip_checked", true)
      .not("site_generated", "eq", true)
      .neq("contact_status", "already_has_website")
      .is("maps_website", null)
      .or("state_email.not.is.null," +
          "and(contact_email.not.is.null,contact_confidence.in.(owner,household))")
      .order("lead_score", { ascending: false, nullsFirst: false })
      .limit(maxLeads!);
    if (batchError) {
      console.error(`[${runId}] batch query failed: ${batchError.message}`);
      return new Response(JSON.stringify({ ok: false, error: batchError.message }), { status: 500 });
    }
    leads = (batch || []) as LeadRow[];
    console.log(`[${runId}] batch mode: ${leads.length} contactable leads (requested up to ${maxLeads})`);
  }

  if (leads.length === 0) {
    console.log(`[${runId}] no eligible leads found`);
    return new Response(JSON.stringify({ ok: true, processed: 0, succeeded: 0, failed: 0, results: [] }), {
      headers: { "Content-Type": "application/json" },
    });
  }

  const results = [];
  for (const lead of leads) {
    console.log(`[${runId}] generating for ${lead.id} (${lead.business_name}, ${lead.business_category}, ${lead.city})`);
    const result = await generateForLead(lead, supabase, openrouterKey, runId);
    results.push(result);
  }

  const succeeded = results.filter((r) => r.ok).length;
  const failed = results.length - succeeded;
  console.log(`[${runId}] done: ${succeeded} succeeded, ${failed} failed out of ${results.length}`);

  return new Response(
    JSON.stringify({ ok: true, processed: results.length, succeeded, failed, results }),
    { headers: { "Content-Type": "application/json" } },
  );
});
