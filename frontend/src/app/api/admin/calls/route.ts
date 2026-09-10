import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase";
import { requireAdmin } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

/**
 * The call list.
 *
 * A business belongs here when there is something real to show them and a
 * number to ring: an approved site with a public address, and a phone number.
 * Anything else wastes the call.
 *
 * Ordered by how warm they are rather than alphabetically, because the first
 * ten calls are the ones that will actually get made. Someone who opened their
 * site already knows what you are talking about.
 */

export type CallRow = {
  lead_id: string;
  business_name: string;
  city: string | null;
  category: string | null;
  phone: string;
  url: string | null;
  emailed_at: string | null;
  viewed_at: string | null;
  has_script: boolean;
  last_outcome: string | null;
  last_called_at: string | null;
  attempts: number;
  warmth: number;
};

const SITE = process.env.NEXT_PUBLIC_URL ?? "https://www.buildittoday.ai";

export async function GET() {
  const gate = await requireAdmin();
  if (!gate.ok) return gate.response;

  const supabase = createServiceRoleClient();

  const { data: sites, error } = await supabase
    .from("demo_sites")
    .select("demo_slug, public_slug, business_name")
    .eq("review_status", "approved")
    .eq("status", "ready");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const slugs = (sites ?? []).map((s) => s.demo_slug);
  if (slugs.length === 0) return NextResponse.json({ calls: [], counts: empty() });

  const [{ data: leads }, { data: scripts }, { data: attempts }] = await Promise.all([
    supabase
      .from("leads")
      .select("id, demo_slug, business_name, city, business_category, contact_phone, outreach_sent_at, demo_viewed_at")
      .in("demo_slug", slugs)
      .not("contact_phone", "is", null),
    supabase.from("call_scripts").select("lead_id"),
    supabase
      .from("call_attempts")
      .select("lead_id, outcome, called_at")
      .order("called_at", { ascending: false }),
  ]);

  const siteBySlug = new Map((sites ?? []).map((s) => [s.demo_slug, s]));
  const scripted = new Set((scripts ?? []).map((s) => s.lead_id));

  // First row per lead is the most recent, since the query is already sorted.
  const lastByLead = new Map<string, { outcome: string; called_at: string }>();
  const countByLead = new Map<string, number>();
  for (const a of attempts ?? []) {
    if (!lastByLead.has(a.lead_id)) lastByLead.set(a.lead_id, a);
    countByLead.set(a.lead_id, (countByLead.get(a.lead_id) ?? 0) + 1);
  }

  const rows: CallRow[] = (leads ?? [])
    .filter((l) => (l.contact_phone ?? "").trim().length >= 10)
    .map((l) => {
      const site = siteBySlug.get(l.demo_slug);
      const last = lastByLead.get(l.id) ?? null;

      // Warmth, highest first. Someone who opened their site outranks someone
      // who has only been emailed; anyone already called drops to the bottom
      // unless they asked to be rung back.
      let warmth = 0;
      if (l.demo_viewed_at) warmth += 40;
      if (l.outreach_sent_at) warmth += 10;
      if (last?.outcome === "call_back") warmth += 60;
      if (last?.outcome === "interested") warmth += 80;
      if (last && ["not_interested", "wrong_number", "sold"].includes(last.outcome)) warmth -= 100;
      else if (last) warmth -= 20;
      if (!scripted.has(l.id)) warmth -= 1;

      return {
        lead_id: l.id,
        business_name: l.business_name ?? site?.business_name ?? "Unnamed",
        city: l.city,
        category: l.business_category,
        phone: (l.contact_phone ?? "").trim(),
        url: site?.public_slug ? `${SITE}/${site.public_slug}` : null,
        emailed_at: l.outreach_sent_at,
        viewed_at: l.demo_viewed_at,
        has_script: scripted.has(l.id),
        last_outcome: last?.outcome ?? null,
        last_called_at: last?.called_at ?? null,
        attempts: countByLead.get(l.id) ?? 0,
        warmth,
      };
    })
    .sort((a, b) => b.warmth - a.warmth || a.business_name.localeCompare(b.business_name));

  const outcomes = (attempts ?? []).map((a) => a.outcome);
  return NextResponse.json({
    calls: rows,
    counts: {
      total: rows.length,
      uncalled: rows.filter((r) => r.attempts === 0).length,
      scripted: rows.filter((r) => r.has_script).length,
      interested: outcomes.filter((o) => o === "interested").length,
      callBack: outcomes.filter((o) => o === "call_back").length,
      sold: outcomes.filter((o) => o === "sold").length,
      notInterested: outcomes.filter((o) => o === "not_interested").length,
      noAnswer: outcomes.filter((o) => o === "no_answer").length,
      totalAttempts: outcomes.length,
    },
  });
}

function empty() {
  return {
    total: 0, uncalled: 0, scripted: 0, interested: 0,
    callBack: 0, sold: 0, notInterested: 0, noAnswer: 0, totalAttempts: 0,
  };
}

const OUTCOMES = [
  "no_answer", "wrong_number", "not_interested", "call_back", "interested", "sold",
] as const;

/** POST — record what happened on a call. */
export async function POST(request: NextRequest) {
  const gate = await requireAdmin();
  if (!gate.ok) return gate.response;

  let body: {
    leadId?: string; outcome?: string; notes?: string;
    quotedSetup?: number | null; quotedMonthly?: number | null;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const leadId = String(body.leadId ?? "");
  const outcome = String(body.outcome ?? "");
  if (!leadId) return NextResponse.json({ error: "leadId is required." }, { status: 400 });
  if (!OUTCOMES.includes(outcome as (typeof OUTCOMES)[number])) {
    return NextResponse.json(
      { error: `outcome must be one of: ${OUTCOMES.join(", ")}` },
      { status: 400 },
    );
  }

  const supabase = createServiceRoleClient();
  const { error } = await supabase.from("call_attempts").insert({
    lead_id: leadId,
    outcome,
    notes: (body.notes ?? "").trim().slice(0, 4000) || null,
    quoted_setup: body.quotedSetup ?? null,
    quoted_monthly: body.quotedMonthly ?? null,
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // A call that landed is worth knowing about away from the desk, and a sale
  // is worth interrupting anything for.
  if (outcome === "sold" || outcome === "interested") {
    try {
      const { alert } = await import("@/lib/telegram");
      const { data: lead } = await supabase
        .from("leads").select("business_name, city").eq("id", leadId).maybeSingle();
      await alert(
        outcome === "sold" ? "payment" : "viewed",
        outcome === "sold"
          ? `${lead?.business_name ?? "A lead"} said yes on the phone`
          : `${lead?.business_name ?? "A lead"} is interested`,
        [lead?.city, (body.notes ?? "").trim()].filter(Boolean).join("\n"),
      );
    } catch {
      // A notification must never cost you the record of the call.
    }
  }

  return NextResponse.json({ ok: true });
}
