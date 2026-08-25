import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase";
import { requireAdmin } from "@/lib/admin-auth";
import { sendDetailsReminder, sendSiteLive } from "@/lib/customer-email";

export const dynamic = "force-dynamic";

const STATES = [
  "awaiting_details", "in_build", "awaiting_domain", "live", "paused", "cancelled",
] as const;
type State = (typeof STATES)[number];

/** GET — everyone who has paid, and what each is waiting on. */
export async function GET() {
  const gate = await requireAdmin();
  if (!gate.ok) return gate.response;

  const supabase = createServiceRoleClient();

  // Written as one literal rather than concatenated: Supabase parses the column
  // list at type level, and a joined string collapses the row type to an error
  // union that then poisons everything downstream.
  type CustomerRow = {
    id: string; business_name: string; email: string; phone: string | null;
    tier: string | null; monthly_cents: number | null; setup_paid_cents: number | null;
    domain: string | null; domain_status: string; onboarding_state: string;
    subscription_status: string | null; current_period_end: string | null;
    demo_url: string | null; demo_slug: string | null; created_at: string;
    auth_user_id: string | null;
  };

  const { data } = await supabase
    .from("customers")
    .select("id, business_name, email, phone, tier, monthly_cents, setup_paid_cents, domain, domain_status, onboarding_state, subscription_status, current_period_end, demo_url, demo_slug, created_at, auth_user_id")
    .order("created_at", { ascending: false });

  const customers = (data ?? []) as CustomerRow[];
  const ids = customers.map((c) => c.id);

  // What they asked for, and what they have been told. Typed explicitly
  // because mixing a query with a Promise.resolve fallback makes TypeScript
  // infer Supabase's error union instead of the row shape.
  type NoteRow = { customer_id: string; author: string; body: string; created_at: string };
  type MailRow = { customer_id: string; kind: string; sent_at: string; error: string | null };

  let notes: NoteRow[] = [];
  let emails: MailRow[] = [];

  if (ids.length) {
    const [n, e] = await Promise.all([
      supabase
        .from("customer_notes")
        .select("customer_id, author, body, created_at")
        .in("customer_id", ids)
        .order("created_at", { ascending: false }),
      supabase
        .from("customer_emails")
        .select("customer_id, kind, sent_at, error")
        .in("customer_id", ids),
    ]);
    notes = (n.data ?? []) as NoteRow[];
    emails = (e.data ?? []) as MailRow[];
  }

  const rows = customers.map((c) => {
    const theirNotes = notes.filter((n) => n.customer_id === c.id);
    const sent = emails
      .filter((e) => e.customer_id === c.id && !e.error)
      .map((e) => e.kind);

    // The one sentence that says what to do about this customer.
    let blockedOn: string;
    switch (c.onboarding_state) {
      case "awaiting_details":
        blockedOn = "Them — no domain or details yet";
        break;
      case "in_build":
        blockedOn = c.domain ? "You — build and launch" : "You — they need a domain choosing";
        break;
      case "awaiting_domain":
        blockedOn = "Them — domain not pointing at us yet";
        break;
      case "live":
        blockedOn = "Nothing — live";
        break;
      default:
        blockedOn = c.onboarding_state;
    }

    return {
      ...c,
      notes: theirNotes,
      emailsSent: sent,
      blockedOn,
      signedIn: Boolean(c.auth_user_id),
      // Paid but never told anything — the state that costs you a customer.
      neverContacted: !sent.includes("welcome"),
    };
  });

  const counts: Record<string, number> = {};
  for (const r of rows) counts[r.onboarding_state] = (counts[r.onboarding_state] ?? 0) + 1;

  return NextResponse.json({
    customers: rows,
    counts,
    total: rows.length,
    needsYou: rows.filter((r) => r.blockedOn.startsWith("You")).length,
    neverContacted: rows.filter((r) => r.neverContacted).length,
  });
}

/** PATCH — move a customer along, or send them one of the lifecycle emails. */
export async function PATCH(request: NextRequest) {
  const gate = await requireAdmin();
  if (!gate.ok) return gate.response;

  let body: { id?: string; state?: string; domainStatus?: string; action?: string; note?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const { id } = body;
  if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 });

  const supabase = createServiceRoleClient();

  if (body.action === "send_details_reminder") {
    const res = await sendDetailsReminder(id);
    return res.ok
      ? NextResponse.json({ ok: true, sent: "details_reminder" })
      : NextResponse.json({ error: res.error }, { status: 502 });
  }

  if (body.action === "send_site_live") {
    // Marking live and telling them are the same act — doing one without the
    // other is how a customer finds out from a friend.
    const res = await sendSiteLive(id);
    if (!res.ok) return NextResponse.json({ error: res.error }, { status: 502 });
    await supabase
      .from("customers")
      .update({ onboarding_state: "live", domain_status: "live", hosting_status: "active" })
      .eq("id", id);
    return NextResponse.json({ ok: true, sent: "site_live", state: "live" });
  }

  const patch: Record<string, unknown> = {};
  if (body.state && (STATES as readonly string[]).includes(body.state)) {
    patch.onboarding_state = body.state as State;
  }
  if (typeof body.domainStatus === "string") patch.domain_status = body.domainStatus;

  if (body.note?.trim()) {
    await supabase.from("customer_notes").insert({
      customer_id: id, author: "staff", body: body.note.trim().slice(0, 4000),
    });
  }

  if (Object.keys(patch).length) {
    const { error } = await supabase.from("customers").update(patch).eq("id", id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
