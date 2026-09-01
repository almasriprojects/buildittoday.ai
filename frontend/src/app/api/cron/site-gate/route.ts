import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { runGate } from "@/lib/site-gate";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

/**
 * POST /api/cron/site-gate — judge every site awaiting review.
 *
 * Runs after the daily lead pull so a site built overnight is decided before
 * the sequencer next looks for someone to email. Add ?dry=1 to see the verdicts
 * without writing them, which is the safe way to watch it work.
 */
export async function POST(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const presented = request.headers.get("x-cron-secret");

  if (!(secret && presented && presented === secret)) {
    const gate = await requireAdmin();
    if (!gate.ok) return gate.response;
  }

  const url = new URL(request.url);
  const dryRun = url.searchParams.get("dry") === "1";
  const limit = Number(url.searchParams.get("limit")) || undefined;

  try {
    const result = await runGate({ dryRun, limit });
    return NextResponse.json({ dryRun, ...result });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Gate run failed" },
      { status: 500 }
    );
  }
}

/** GET — the same judgement, never written. */
export async function GET(request: NextRequest) {
  const gate = await requireAdmin();
  if (!gate.ok) return gate.response;

  const limit = Number(new URL(request.url).searchParams.get("limit")) || undefined;
  const result = await runGate({ dryRun: true, limit });
  return NextResponse.json({ dryRun: true, ...result });
}
