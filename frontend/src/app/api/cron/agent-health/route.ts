import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase";
import { alert } from "@/lib/telegram";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * POST /api/cron/agent-health — is anything that should be running, not?
 *
 * The Agents page has always shown this, but only to somebody who opens it.
 * Nothing ever went looking, so a job could stop for a week and the first
 * sign would be a number that quietly failed to grow.
 *
 * It alerts on two things and deliberately not on a third:
 *
 *   overdue  — it has run before and has not run when it should have
 *   failed   — it ran and the endpoint refused, errored, or timed out
 *   never run — NOT alerted. A job scheduled an hour ago has legitimately
 *               never run, and an alarm for that trains you to ignore the
 *               channel. It is shown on the Agents page instead.
 *
 * Silence is the success case. This says nothing at all when everything is
 * working, so a message from it always means something.
 */

type Health = {
  jobname: string;
  schedule: string;
  active: boolean;
  hours_since: number | null;
  overdue: boolean;
  never_run: boolean;
  last_http: number | null;
  last_reply: string | null;
  verdict: string;
};

/**
 * How much OpenRouter credit is left, in days of building.
 *
 * An agent that is running perfectly and getting 402 back from every model
 * call is not healthy, but nothing here could see that: pg_cron reports the
 * request as sent, the endpoint returns 200 having handled the error, and the
 * only trace is an error column on seven rows nobody reads. Running out has
 * stopped this pipeline twice, and both times it was found days later.
 *
 * Warned at three days rather than at zero, because topping up is a manual
 * step and a warning that arrives after everything has stopped is a report,
 * not a warning.
 *
 * The key lives only in Supabase's function secrets, so the balance is read
 * through the edge function that holds it. A failure to reach it is not
 * treated as low credit — a false alarm here trains you to ignore the channel.
 */
const LOW_CREDIT_DAYS = 3;

async function openRouterCredit(): Promise<
  { remaining: number; days: number; leads: number } | null
> {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!base) return null;
  try {
    const res = await fetch(`${base}/functions/v1/openrouter-balance`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "{}",
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) return null;
    const d = await res.json();
    if (!d?.ok) return null;
    return {
      remaining: Number(d.remaining ?? 0),
      days: Number(d.daysAtTenADay ?? 0),
      leads: Number(d.leadsRemaining ?? 0),
    };
  } catch {
    return null;
  }
}

function authorised(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const header = request.headers.get("x-cron-secret");
  const bearer = request.headers.get("authorization");
  return header === secret || bearer === `Bearer ${secret}`;
}

export async function POST(request: NextRequest) {
  if (!authorised(request)) {
    return NextResponse.json({ error: "Not authorised" }, { status: 401 });
  }

  const supabase = createServiceRoleClient();
  const { data, error } = await supabase.rpc("agent_health");
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const rows = (data ?? []) as Health[];
  const credit = await openRouterCredit();

  // never_run is excluded on purpose, and excluding it correctly took two
  // attempts: the first version treated "has not run recently" and "has never
  // run" as the same flag, so rescheduling six jobs — which gives them new ids
  // and an empty history — fired an alarm naming six healthy agents. An alarm
  // that is wrong once is an alarm that gets muted.
  const broken = rows.filter(
    (r) => !r.active || r.overdue ||
           r.verdict.startsWith("request failed") ||
           r.verdict.startsWith("endpoint returned"),
  );
  const newlyScheduled = rows.filter((r) => r.never_run && r.active);

  const creditLow = credit !== null && credit.days < LOW_CREDIT_DAYS;

  if (broken.length === 0 && !creditLow) {
    return NextResponse.json({
      ok: true,
      checked: rows.length,
      broken: 0,
      credit,
      // Reported, not alerted: these are visible on the Agents page and will
      // resolve themselves the first time each job comes round.
      awaitingFirstRun: newlyScheduled.map((r) => r.jobname),
      note: "All agents healthy — no alert sent.",
    });
  }

  if (creditLow && broken.length === 0) {
    await alert(
      "agent_down",
      `OpenRouter credit is down to $${credit!.remaining.toFixed(2)}`,
      `About ${credit!.leads} more sites — roughly ${credit!.days} day${credit!.days === 1 ? "" : "s"} at 10 a day.\n\n` +
        `Every agent is healthy. When this hits zero they keep running and quietly fail: ` +
        `no copy, no photographs, no sites, and leads landing in failed.\n\n` +
        `openrouter.ai/credits`,
    );
    return NextResponse.json({ ok: true, checked: rows.length, broken: 0, credit, alerted: "low_credit" });
  }

  const lines = broken.map((r) => {
    const when = r.hours_since === null
      ? "never run"
      : `last ran ${r.hours_since}h ago`;
    return `• ${r.jobname} — ${r.verdict} (${when})`;
  });

  // Credit rides along on the same message rather than firing a second one.
  // If the agents are failing because the balance is gone, those two facts
  // belong in one alert, not two that have to be read together.
  if (creditLow) {
    lines.push(
      `• OpenRouter credit — $${credit!.remaining.toFixed(2)} left, about ${credit!.leads} more sites`,
    );
  }

  await alert(
    "agent_down",
    `${broken.length} agent${broken.length === 1 ? "" : "s"} need attention`,
    `${lines.join("\n")}\n\nbuildittoday.ai/admin/agents`,
  );

  return NextResponse.json({
    ok: true,
    checked: rows.length,
    broken: broken.length,
    credit,
    alerted: broken.map((b) => ({ job: b.jobname, verdict: b.verdict })),
  });
}

/** GET — the same verdicts, for the Agents page, without alerting. */
export async function GET(request: NextRequest) {
  if (!authorised(request)) {
    return NextResponse.json({ error: "Not authorised" }, { status: 401 });
  }
  const supabase = createServiceRoleClient();
  const { data } = await supabase.rpc("agent_health");
  return NextResponse.json({ agents: data ?? [] });
}
