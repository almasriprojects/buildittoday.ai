"use client";

import { useCallback, useEffect, useState } from "react";
import { AlertTriangle, Check, Mail, RefreshCw, Rocket } from "lucide-react";

type Note = { author: string; body: string; created_at: string };
type Row = {
  id: string;
  business_name: string;
  email: string;
  phone: string | null;
  tier: string | null;
  monthly_cents: number | null;
  setup_paid_cents: number | null;
  domain: string | null;
  domain_status: string;
  onboarding_state: string;
  subscription_status: string | null;
  current_period_end: string | null;
  demo_url: string | null;
  created_at: string;
  notes: Note[];
  emailsSent: string[];
  blockedOn: string;
  signedIn: boolean;
  neverContacted: boolean;
};

const money = (c: number | null) => (c ? `$${(c / 100).toLocaleString("en-US")}` : "—");
const day = (s: string | null) =>
  s ? new Date(s).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—";

export function CustomersClient() {
  const [rows, setRows] = useState<Row[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [needsYou, setNeedsYou] = useState(0);
  const [neverContacted, setNeverContacted] = useState(0);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [open, setOpen] = useState<string | null>(null);

  const load = useCallback(() => {
    fetch("/api/admin/launch-queue")
      .then((r) => r.json())
      .then((d) => {
        if (d.error) throw new Error(d.error);
        setRows(d.customers ?? []);
        setCounts(d.counts ?? {});
        setNeedsYou(d.needsYou ?? 0);
        setNeverContacted(d.neverContacted ?? 0);
      })
      .catch((e) => setErr(e.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  async function act(id: string, body: Record<string, unknown>, label: string) {
    setBusy(id); setErr(null); setMsg(null);
    try {
      const res = await fetch("/api/admin/launch-queue", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, ...body }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error);
      setMsg(label);
      load();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "That didn't work.");
    } finally {
      setBusy(null);
    }
  }

  if (loading) return <p className="py-10 text-center text-sm text-muted-foreground">Loading…</p>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Customers</h1>
        <p className="mt-1 text-muted-foreground">
          Everyone who has paid, and what each one is waiting on.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-4">
        <Stat n={rows.length} label="Paying customers" />
        <Stat n={needsYou} label="Waiting on you" tone={needsYou ? "warn" : undefined} />
        <Stat n={counts.awaiting_details ?? 0} label="Waiting on them" />
        <Stat n={counts.live ?? 0} label="Live" tone={counts.live ? "good" : undefined} />
      </div>

      {neverContacted > 0 && (
        <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-900">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>
            <strong>{neverContacted}</strong> paid customer{neverContacted > 1 ? "s have" : " has"}{" "}
            never received a welcome email. They have been charged and told nothing.
          </span>
        </div>
      )}

      {msg && <p className="text-sm text-emerald-700"><Check className="mr-1 inline h-3 w-3" />{msg}</p>}
      {err && <p role="alert" className="text-sm text-red-700">{err}</p>}

      {rows.length === 0 ? (
        <div className="rounded-xl border bg-card py-16 text-center">
          <p className="font-medium">No customers yet</p>
          <p className="mt-1 text-sm text-muted-foreground">
            The first payment will appear here with everything it needs.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {rows.map((c) => (
            <div key={c.id} className="rounded-xl border bg-card">
              <button
                onClick={() => setOpen(open === c.id ? null : c.id)}
                className="flex w-full items-start gap-4 px-5 py-4 text-left"
              >
                <span className="min-w-0 flex-1">
                  <span className="block font-medium">{c.business_name}</span>
                  <span className="mt-0.5 block text-xs text-muted-foreground">
                    {c.email} · {c.tier ?? "—"} · {money(c.monthly_cents)}/mo
                  </span>
                </span>
                <span
                  className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${
                    c.blockedOn.startsWith("You")
                      ? "bg-amber-100 text-amber-900"
                      : c.onboarding_state === "live"
                      ? "bg-emerald-100 text-emerald-800"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {c.blockedOn}
                </span>
              </button>

              {open === c.id && (
                <div className="space-y-4 border-t px-5 py-4 text-sm">
                  <dl className="grid gap-3 sm:grid-cols-3">
                    <Field label="Domain" value={c.domain ?? "not given"} />
                    <Field label="Domain status" value={c.domain_status.replace(/_/g, " ")} />
                    <Field label="Phone" value={c.phone ?? "—"} />
                    <Field label="Paid" value={money(c.setup_paid_cents)} />
                    <Field label="Subscription" value={(c.subscription_status ?? "—").replace(/_/g, " ")} />
                    <Field label="Next payment" value={day(c.current_period_end)} />
                    <Field label="Signed in yet" value={c.signedIn ? "yes" : "not yet"} />
                    <Field label="Customer since" value={day(c.created_at)} />
                    <Field label="Emails sent" value={c.emailsSent.join(", ") || "none"} />
                  </dl>

                  {c.notes.length > 0 && (
                    <div className="rounded-lg bg-muted/50 p-3">
                      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        What they asked for
                      </p>
                      {c.notes.map((n, i) => (
                        <p key={i} className="mb-2 whitespace-pre-wrap leading-relaxed last:mb-0">
                          <span className="text-xs text-muted-foreground">
                            {n.author} · {day(n.created_at)}
                          </span>
                          <br />
                          {n.body}
                        </p>
                      ))}
                    </div>
                  )}

                  <div className="flex flex-wrap gap-2 border-t pt-3">
                    {c.demo_url && (
                      <a
                        href={c.demo_url}
                        className="inline-flex h-9 items-center rounded-lg border px-3 text-xs font-medium hover:bg-muted"
                      >
                        View their site
                      </a>
                    )}
                    {c.onboarding_state === "awaiting_details" && (
                      <button
                        onClick={() => act(c.id, { action: "send_details_reminder" }, "Reminder sent.")}
                        disabled={busy === c.id}
                        className="inline-flex h-9 items-center gap-1.5 rounded-lg border px-3 text-xs font-medium hover:bg-muted disabled:opacity-40"
                      >
                        <Mail className="h-3.5 w-3.5" /> Chase their details
                      </button>
                    )}
                    {c.onboarding_state !== "live" && (
                      <button
                        onClick={() => act(c.id, { action: "send_site_live" }, "Marked live and told them.")}
                        disabled={busy === c.id}
                        className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-emerald-600 px-3 text-xs font-medium text-white hover:bg-emerald-700 disabled:opacity-40"
                      >
                        <Rocket className="h-3.5 w-3.5" /> Mark live &amp; email them
                      </button>
                    )}
                    <select
                      value={c.onboarding_state}
                      onChange={(e) => act(c.id, { state: e.target.value }, "Stage updated.")}
                      disabled={busy === c.id}
                      className="h-9 rounded-lg border bg-background px-2 text-xs"
                    >
                      {["awaiting_details","in_build","awaiting_domain","live","paused","cancelled"].map((s) => (
                        <option key={s} value={s}>{s.replace(/_/g, " ")}</option>
                      ))}
                    </select>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <button
        onClick={load}
        className="inline-flex h-9 items-center gap-2 rounded-lg border px-3 text-xs font-medium hover:bg-muted"
      >
        <RefreshCw className="h-3.5 w-3.5" /> Refresh
      </button>
    </div>
  );
}

function Stat({ n, label, tone }: { n: number; label: string; tone?: "warn" | "good" }) {
  return (
    <div
      className={`rounded-xl border p-4 ${
        tone === "warn" ? "border-amber-200 bg-amber-50"
        : tone === "good" ? "border-emerald-200 bg-emerald-50"
        : "bg-card"
      }`}
    >
      <div className="text-2xl font-semibold tabular-nums">{n}</div>
      <div className="mt-0.5 text-xs text-muted-foreground">{label}</div>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 font-medium">{value}</dd>
    </div>
  );
}
