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
  last_http: number | null;
  last_reply: string | null;
  verdict: string;
};

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
  const broken = rows.filter(
    (r) => !r.active || r.overdue || r.verdict.startsWith("request failed") ||
           r.verdict.startsWith("endpoint returned"),
  );

  if (broken.length === 0) {
    return NextResponse.json({
      ok: true, checked: rows.length, broken: 0,
      note: "All agents healthy — no alert sent.",
    });
  }

  const lines = broken.map((r) => {
    const when = r.hours_since === null
      ? "never run"
      : `last ran ${r.hours_since}h ago`;
    return `• ${r.jobname} — ${r.verdict} (${when})`;
  });

  await alert(
    "agent_down",
    `${broken.length} agent${broken.length === 1 ? "" : "s"} need attention`,
    `${lines.join("\n")}\n\nbuildittoday.ai/admin/agents`,
  );

  return NextResponse.json({
    ok: true,
    checked: rows.length,
    broken: broken.length,
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
