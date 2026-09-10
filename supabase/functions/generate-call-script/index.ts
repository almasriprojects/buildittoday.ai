import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

/**
 * generate-call-script — what to say when this specific business answers.
 *
 * 52 sites are approved and 49 of those businesses have a phone number, and
 * not one has been called. Email has returned 0 sales from 47 sends, and
 * because the buy button was broken for most of that window there is no way to
 * read that as a verdict on anything. A call answers what an email cannot: not
 * whether they opened it, but what they said and what they would pay.
 *
 * The script is written from the business's OWN generated copy, not from its
 * category. A roofer in Naples and a roofer in Pensacola get different opening
 * lines, because the thing that stops someone hanging up in the first eight
 * seconds is hearing a detail only a real person would know.
 *
 * Written once and stored. Regenerating on every page view would spend credit
 * on a business whose details have not changed, and the balance is $4.49.
 */

const MODEL = "anthropic/claude-sonnet-4.5";

/**
 * Who is calling. Written into the script rather than left as "[Name]",
 * because a placeholder in the middle of a sentence you are reading aloud to a
 * stranger is exactly where a call falls apart. Kept in step with the sign-off
 * and phone number used in lib/customer-email.ts.
 */
const CALLER = "Anan";
const CALLBACK = "(502) 406-0382";

const SYSTEM = `You write phone scripts for one person cold-calling small business owners
in Florida. He built each of them a real website, unasked, and is calling to
show them.

He is not a salesman. He is one person, short of money, calling from a list.
His name and callback number are given below — write them into the script as
spoken words. Never leave a placeholder like [Name] or [your number]: a gap in
a sentence being read aloud to a stranger is where the call falls apart.
The script must sound like him, not like a call centre — no "I hope I'm
catching you at a good time", no "we specialise in providing solutions", no
enthusiasm that a stranger has not earned.

HARD RULES:
- The first sentence must contain a specific, checkable detail about THIS
  business, drawn from the content given. That is what stops the hang-up.
- Never claim the business asked for this, never imply an existing
  relationship, never say "as we discussed".
- Never invent facts: no fake awards, no invented customer numbers, no
  "I noticed your competitors are…".
- The site is genuinely already built and live. Say so plainly.
- Assume most calls reach voicemail. The voicemail must work alone.
- Price: the site is $750 up front plus $50/month. There is room to come down
  and the caller knows it, so the objection handling must give him a real
  ladder to walk down, not a script that pretends the price is fixed.
- Keep every spoken line short enough to say out loud in one breath.

Output strict JSON only, no prose outside it:
{
  "opening": "2-3 sentences. First sentence carries the specific detail.",
  "why_them": "One sentence on why this business specifically.",
  "the_ask": "The single sentence that asks them to go look at the site now.",
  "site_walkthrough": "2-3 sentences to say while they are looking at it.",
  "price_answer": "What to say when they ask what it costs.",
  "price_ladder": ["Full price line", "First concession", "Floor — what to take rather than lose them"],
  "objections": [
    {"they_say": "...", "you_say": "..."},
    {"they_say": "...", "you_say": "..."},
    {"they_say": "...", "you_say": "..."}
  ],
  "close": "The specific thing to ask for at the end.",
  "voicemail": "30 seconds, spoken. Must stand alone and give the URL clearly.",
  "do_not_say": ["Two or three things that would kill this particular call"]
}`;

const OR_KEY = Deno.env.get("OPENROUTER_API_KEY")!;
const db = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

Deno.serve(async (req: Request) => {
  let leadId = "";
  let force = false;
  try {
    const body = await req.json();
    leadId = String(body.leadId ?? "");
    force = Boolean(body.force);
  } catch {
    return json({ ok: false, error: "Expected { leadId }" }, 400);
  }
  if (!leadId) return json({ ok: false, error: "leadId is required" }, 400);

  // Already written? Hand it back rather than pay for it twice.
  if (!force) {
    const { data: existing } = await db
      .from("call_scripts").select("script_json, generated_at")
      .eq("lead_id", leadId).maybeSingle();
    if (existing) {
      return json({ ok: true, cached: true, script: existing.script_json });
    }
  }

  const { data: lead } = await db
    .from("leads")
    .select("id, business_name, city, state, business_category, contact_phone, owner_full_name, generated_content, demo_slug, outreach_sent_at")
    .eq("id", leadId).maybeSingle();

  if (!lead) return json({ ok: false, error: "No such lead" }, 404);
  if (!lead.generated_content) {
    return json({ ok: false, error: "This lead has no site copy yet." }, 400);
  }

  const { data: site } = await db
    .from("demo_sites").select("public_slug")
    .eq("demo_slug", lead.demo_slug).maybeSingle();

  const url = site?.public_slug
    ? `buildittoday.ai/${site.public_slug}`
    : "the site (no public address yet)";

  const emailed = lead.outreach_sent_at
    ? `They were emailed about this on ${new Date(lead.outreach_sent_at).toDateString()} and did not reply, so he is following up — acknowledge the email rather than pretending it never happened.`
    : `They have never been contacted. This call is the first they will hear of it.`;

  try {
    const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OR_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          { role: "system", content: SYSTEM },
          {
            role: "user",
            content:
              `The caller is ${CALLER}. His callback number is ${CALLBACK}. ` +
              `Use both verbatim wherever the script needs them.\n\n` +
              `Business: ${lead.business_name}\n` +
              `Owner: ${lead.owner_full_name ?? "unknown — do not guess a name"}\n` +
              `Where: ${lead.city ?? ""}, ${lead.state ?? "FL"}\n` +
              `Trade: ${lead.business_category ?? "small business"}\n` +
              `Their site is live at: ${url}\n` +
              `${emailed}\n\n` +
              `The copy already written for them, which is what is on the site:\n` +
              JSON.stringify(lead.generated_content).slice(0, 4000),
          },
        ],
      }),
    });

    const text = await res.text();
    if (!res.ok) {
      return json({ ok: false, error: `OpenRouter ${res.status}: ${text.slice(0, 200)}` }, 502);
    }

    const data = JSON.parse(text);
    const raw = data.choices[0].message.content as string;
    const script = JSON.parse(raw.slice(raw.indexOf("{"), raw.lastIndexOf("}") + 1));
    const cost = data?.usage?.cost ?? 0;

    const { error } = await db.from("call_scripts").upsert({
      lead_id: lead.id,
      script_json: script,
      model: MODEL,
      cost_usd: cost,
      generated_at: new Date().toISOString(),
    }, { onConflict: "lead_id" });
    if (error) return json({ ok: false, error: `save failed: ${error.message}` }, 500);

    return json({ ok: true, cached: false, script, cost });
  } catch (e) {
    return json({ ok: false, error: e instanceof Error ? e.message : String(e) }, 502);
  }
});
