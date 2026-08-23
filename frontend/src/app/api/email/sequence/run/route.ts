import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase";
import { requireAdmin } from "@/lib/admin-auth";
import { runSequence } from "@/lib/email-sequence";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

/**
 * GET — what the sequence would do, without doing it. Lets the queue be
 * inspected before sending is ever switched on.
 */
export async function GET() {
  const gate = await requireAdmin();
  if (!gate.ok) return gate.response;

  const supabase = createServiceRoleClient();
  const now = new Date().toISOString();

  const [{ data: states }, { count: approved }, { count: eligible }] = await Promise.all([
    supabase.from("lead_email_state").select("sequence_step, status, next_send_at"),
    supabase.from("demo_sites").select("*", { count: "exact", head: true })
      .eq("review_status", "approved"),
    supabase.from("leads").select("*", { count: "exact", head: true })
      .not("contact_email", "is", null)
      .is("unsubscribed_at", null)
      .is("email_bounced_at", null),
  ]);

  const rows = states ?? [];
  const dueNow = rows.filter(
    (s) => s.next_send_at !== null && s.next_send_at <= now &&
           (s.status === "active" || s.status === "clicked")
  );

  const byStatus: Record<string, number> = {};
  for (const s of rows) byStatus[s.status] = (byStatus[s.status] ?? 0) + 1;

  return NextResponse.json({
    enrolled: rows.length,
    dueNow: dueNow.length,
    nextStep: dueNow.reduce<Record<number, number>>((acc, s) => {
      const n = s.sequence_step + 1;
      acc[n] = (acc[n] ?? 0) + 1;
      return acc;
    }, {}),
    byStatus,
    approvedDemos: approved ?? 0,
    emailableLeads: eligible ?? 0,
  });
}

/**
 * POST /api/email/sequence/run — advance the outreach sequence.
 *
 * Called hourly by pg_cron, and by the "Run now" button in the admin panel.
 * Two ways in: a signed-in admin, or the shared cron secret. Nothing else,
 * because this endpoint sends real email.
 */
export async function POST(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const presented = request.headers.get("x-cron-secret");

  // Either the scheduler's shared secret, or a signed-in admin pressing
  // "Run now". Merely being signed in is not enough — this endpoint sends mail.
  if (!(secret && presented && presented === secret)) {
    const gate = await requireAdmin();
    if (!gate.ok) return gate.response;
  }

  try {
    const result = await runSequence();
    return NextResponse.json(result);
  } catch (e) {
    // A scheduler needs a non-2xx to notice something is wrong.
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Sequence run failed" },
      { status: 500 }
    );
  }
}
