import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

/**
 * Fetches the call script for one lead.
 *
 * The writing happens in Supabase, not here: the OpenRouter key is a function
 * secret and has never been given to the web app. This route exists to put an
 * admin check in front of it, because the edge function itself runs without
 * JWT verification so that pg_cron can reach its siblings.
 *
 * Scripts are written once and stored, so a second look costs nothing. Only an
 * explicit rewrite spends credit again — worth guarding while the balance is
 * measured in single dollars.
 */

const SUPABASE = process.env.NEXT_PUBLIC_SUPABASE_URL;

export async function POST(request: NextRequest) {
  const gate = await requireAdmin();
  if (!gate.ok) return gate.response;

  if (!SUPABASE) {
    return NextResponse.json({ error: "Supabase URL is not configured." }, { status: 500 });
  }

  let leadId = "";
  let force = false;
  try {
    const body = await request.json();
    leadId = String(body.leadId ?? "");
    force = Boolean(body.force);
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
  if (!leadId) return NextResponse.json({ error: "leadId is required." }, { status: 400 });

  try {
    const res = await fetch(`${SUPABASE}/functions/v1/generate-call-script`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ leadId, force }),
      signal: AbortSignal.timeout(110000),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data?.ok) {
      return NextResponse.json(
        { error: data?.error ?? `Script service returned ${res.status}.` },
        { status: 502 },
      );
    }
    return NextResponse.json(data);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Could not reach the script service." },
      { status: 502 },
    );
  }
}
