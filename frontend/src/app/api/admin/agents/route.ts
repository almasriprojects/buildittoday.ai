import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase";
import { requireAdmin } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

const SITE = process.env.NEXT_PUBLIC_URL ?? "https://www.buildittoday.ai";

/**
 * Every scheduled job, described in terms of what it does for the business
 * rather than what it is called.
 *
 * `endpoint` is what the Run now button calls. Jobs without one are Supabase
 * edge functions the browser cannot reach directly — they are shown, but their
 * button is not offered rather than offered and broken.
 */
const AGENTS: Record<string, {
  title: string;
  does: string;
  matters: string;
  endpoint?: string;
  order: number;
}> = {
  "sunbiz-pull-daily": {
    order: 1,
    title: "Lead scraper",
    does: "Reads newly registered Florida businesses from the state's public filing server.",
    matters: "The top of the funnel. Everything downstream is built from what this brings in.",
  },
  "auto-classify-leads": {
    order: 2,
    title: "Lead classifier",
    does: "Decides which new registrations are worth building a site for, and what trade they are in.",
    matters: "Roughly 40% of filings are holding companies and trusts nobody should be emailed about.",
  },
  "place-leads-on-map": {
    order: 3,
    title: "Map placer",
    does: "Puts each new lead on the map at the centre of its postcode, using points already held.",
    matters: "Costs nothing. Geocoding each address individually would mean thousands of requests to a free service.",
  },
  "site-quality-gate": {
    order: 4,
    title: "Quality gate",
    does: "Opens every newly built site and checks the video, images, copy and assets, then approves what passes.",
    matters: "Replaces reviewing each site by hand. Holds the first ten and a sample after that for human eyes.",
    endpoint: "/api/cron/site-gate",
  },
  "email-sequence-hourly": {
    order: 5,
    title: "Outreach sequencer",
    does: "Sends the next email to whoever is due, branching to the warm version for anyone who clicked.",
    matters: "Sends at most three per run so an hourly cadence looks like a person working a list.",
    endpoint: "/api/email/sequence/run",
  },
  "annual-report-reminders": {
    order: 6,
    title: "Renewal reminders",
    does: "Warns customers before Florida's 1 May annual report deadline.",
    matters: "The state adds $400 automatically. This is the strongest reason a customer stays past month three.",
    endpoint: "/api/cron/annual-reports",
  },
  "telegram-daily-digest": {
    order: 7,
    title: "Morning digest",
    does: "Sends one Telegram message covering money, pipeline, engagement and what is blocking revenue.",
    matters: "Alerts fire separately and immediately for anything that cannot wait until morning.",
    endpoint: "/api/cron/digest",
  },
};

type Row = {
  jobname: string; schedule: string; active: boolean;
  last_run: string | null; last_status: string | null;
  last_duration: string | null; runs_24h: number; failures_24h: number;
};

// A raw cron expression means nothing at a glance. This turns it into a
// sentence — written as a line comment because a cron string containing a
// star-slash closes a block comment early, which is what broke the build here.
function readable(cron: string): string {
  const map: Record<string, string> = {
    "*/15 * * * *": "Every 15 minutes",
    "0 10 * * 1-5": "Weekdays at 10:00 UTC (6am ET)",
    "40 10 * * 1-5": "Weekdays at 10:40 UTC (6:40am ET)",
    "40 11 * * *": "Daily at 11:40 UTC (7:40am ET)",
    "0 12 * * *": "Daily at 12:00 UTC (8am ET)",
    "5 14 * * *": "Daily at 14:05 UTC (10am ET)",
    "7 13-23 * * *": "Hourly, 13:00–23:00 UTC (9am–7pm ET)",
  };
  return map[cron] ?? cron;
}

export async function GET() {
  const gate = await requireAdmin();
  if (!gate.ok) return gate.response;

  const supabase = createServiceRoleClient();
  const [{ data: status }, { data: responses }] = await Promise.all([
    supabase.rpc("agent_status"),
    supabase.rpc("agent_responses", { limit_n: 25 }),
  ]);

  const rows = ((status ?? []) as Row[]).map((r) => {
    const meta = AGENTS[r.jobname] ?? {
      order: 99, title: r.jobname, does: "", matters: "",
    };
    return {
      name: r.jobname,
      ...meta,
      schedule: readable(r.schedule),
      cron: r.schedule,
      active: r.active,
      lastRun: r.last_run,
      // pg_cron reports "succeeded" once the HTTP request is queued, not once
      // the endpoint answers. A job can look healthy while its endpoint 500s,
      // so the response body below is the honest signal.
      lastStatus: r.last_status,
      runs24h: Number(r.runs_24h ?? 0),
      failures24h: Number(r.failures_24h ?? 0),
      canRunNow: Boolean(meta.endpoint),
    };
  }).sort((a, b) => a.order - b.order);

  type Resp = { id: number; created: string; status_code: number | null; url: string; body: string };
  const recent = ((responses ?? []) as Resp[]).map((r) => ({
    at: r.created,
    status: r.status_code,
    // Just the path — the host is the same every time and only adds noise.
    endpoint: (r.url || "").replace(/^https?:\/\/[^/]+/, "") || "—",
    body: r.body,
    ok: r.status_code !== null && r.status_code >= 200 && r.status_code < 300,
  }));

  return NextResponse.json({
    agents: rows,
    recent,
    healthy: rows.every((a) => a.active && a.failures24h === 0),
  });
}

/** POST — run one now. The same endpoint its schedule calls. */
export async function POST(request: NextRequest) {
  const gate = await requireAdmin();
  if (!gate.ok) return gate.response;

  let name = "";
  try {
    name = String((await request.json()).name ?? "");
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const meta = AGENTS[name];
  if (!meta?.endpoint) {
    return NextResponse.json(
      { error: "This one runs on Supabase and can't be triggered from here." },
      { status: 400 }
    );
  }

  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "CRON_SECRET is not set." }, { status: 500 });
  }

  try {
    const res = await fetch(`${SITE}${meta.endpoint}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-cron-secret": secret },
      body: "{}",
    });
    const body = await res.json().catch(() => ({}));
    return NextResponse.json({ ok: res.ok, status: res.status, result: body });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Could not run it." },
      { status: 502 }
    );
  }
}
