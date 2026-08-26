import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { runAnnualReportReminders, milestoneFor } from "@/lib/annual-report";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

/**
 * POST /api/cron/annual-reports — send whichever annual report reminder is due.
 *
 * Runs daily and does nothing on 361 of them. Checking every morning and
 * finding nothing due is far safer than trying to schedule four exact dates a
 * year and discovering in April that one of them never fired.
 */
export async function POST(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const presented = request.headers.get("x-cron-secret");

  if (!(secret && presented && presented === secret)) {
    const gate = await requireAdmin();
    if (!gate.ok) return gate.response;
  }

  const dryRun = new URL(request.url).searchParams.get("dry") === "1";

  try {
    const result = await runAnnualReportReminders({ dryRun });
    return NextResponse.json(result);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Reminder run failed" },
      { status: 500 }
    );
  }
}

/** GET — what would happen today, without doing it. */
export async function GET() {
  const gate = await requireAdmin();
  if (!gate.ok) return gate.response;

  const today = new Date();
  const milestone = milestoneFor(today);

  return NextResponse.json({
    today: today.toISOString().slice(0, 10),
    milestoneDueToday: milestone,
    nextDates: ["1 February", "1 March", "1 April", "20 April"],
    note: milestone
      ? `A "${milestone}" reminder would be sent to every active customer who has not filed.`
      : "Nothing is due today. The job runs daily and exits.",
  });
}
