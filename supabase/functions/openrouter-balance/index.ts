import "jsr:@supabase/functions-js/edge-runtime.d.ts";

/**
 * openrouter-balance — how much credit is left, and how long it lasts.
 *
 * Every model call in this project runs through OpenRouter, and when the
 * balance hits zero nothing announces it: the copy writer, the photographer
 * and the site builder all just start returning 402, the daily run reports
 * "requested html for 7", and seven leads quietly land in `failed`. That has
 * now happened twice, and both times it was found by reading an error message
 * days later rather than by being told.
 *
 * The key lives in this project's function secrets and nowhere else, so the
 * balance can only be read from inside an edge function.
 */
const OR_KEY = Deno.env.get("OPENROUTER_API_KEY")!;

// One lead costs three photographs, one clip and one HTML build.
const COST_PER_LEAD = 0.35;

Deno.serve(async () => {
  const res = await fetch("https://openrouter.ai/api/v1/credits", {
    headers: { Authorization: `Bearer ${OR_KEY}` },
  });
  const body = await res.text();
  if (!res.ok) {
    return new Response(
      JSON.stringify({ ok: false, status: res.status, body: body.slice(0, 300) }),
      { status: 502, headers: { "Content-Type": "application/json" } },
    );
  }

  const d = JSON.parse(body).data ?? {};
  const granted = Number(d.total_credits ?? 0);
  const used = Number(d.total_usage ?? 0);
  const remaining = granted - used;

  return new Response(JSON.stringify({
    ok: true,
    granted: Number(granted.toFixed(2)),
    used: Number(used.toFixed(2)),
    remaining: Number(remaining.toFixed(2)),
    // What that means in the only unit that matters here.
    leadsRemaining: Math.floor(remaining / COST_PER_LEAD),
    daysAtTenADay: Math.floor(remaining / (COST_PER_LEAD * 10)),
  }), { headers: { "Content-Type": "application/json" } });
});
