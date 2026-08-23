"use client";

import { useCallback, useEffect, useState } from "react";
import { AlertTriangle, Check, Mail, Play, Send } from "lucide-react";

type Queue = {
  enrolled: number;
  dueNow: number;
  nextStep: Record<string, number>;
  byStatus: Record<string, number>;
  approvedDemos: number;
  emailableLeads: number;
};

type Settings = {
  from_name: string;
  from_email: string;
  reply_to: string;
  postal_address: string | null;
  daily_cap: number;
  sending_enabled: boolean;
};

type Template = {
  slug: string;
  name: string;
  subject: string;
  body_text: string;
  description: string | null;
  sequence_step: number | null;
  active: boolean;
};

export default function EmailsPage() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [sentToday, setSentToday] = useState(0);
  const [resendOk, setResendOk] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [open, setOpen] = useState<string | null>(null);
  const [queue, setQueue] = useState<Queue | null>(null);
  const [running, setRunning] = useState(false);

  const load = useCallback(() => {
    Promise.all([
      fetch("/api/email/settings").then((r) => r.json()),
      fetch("/api/email/sequence/run").then((r) => r.json()).catch(() => null),
    ])
      .then(([d, q]) => {
        setSettings(d.settings);
        setTemplates(d.templates ?? []);
        setSentToday(d.sentToday ?? 0);
        setResendOk(Boolean(d.resendConfigured));
        if (q && !q.error) setQueue(q);
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  async function runNow() {
    setRunning(true);
    setErr(null);
    setMsg(null);
    try {
      const res = await fetch("/api/email/sequence/run", { method: "POST" });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error);
      if (!d.ran) setErr(d.reason);
      else {
        const parts = [`${d.sent.length} sent`];
        if (d.enrolled) parts.push(`${d.enrolled} newly enrolled`);
        if (d.failed.length) parts.push(`${d.failed.length} failed`);
        if (d.reason) parts.push(d.reason);
        setMsg(parts.join(" · "));
      }
      load();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Run failed.");
    } finally {
      setRunning(false);
    }
  }

  async function save(patch: Partial<Settings>) {
    setSaving(true);
    setErr(null);
    setMsg(null);
    try {
      const res = await fetch("/api/email/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error);
      setSettings(d.settings);
      setMsg("Saved.");
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Could not save.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <p className="py-10 text-center text-sm text-muted-foreground">Loading…</p>;
  if (!settings) return null;

  const ready = resendOk && Boolean(settings.postal_address);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Email</h1>
        <p className="mt-1 text-muted-foreground">
          Sender identity, sending controls, and the outreach sequence.
        </p>
      </div>

      {/* Readiness */}
      <div className="grid gap-3 sm:grid-cols-3">
        <Check3 ok={resendOk} label="Resend connected" detail={resendOk ? "API key present" : "RESEND_API_KEY missing in Vercel"} />
        <Check3 ok={Boolean(settings.postal_address)} label="Postal address" detail={settings.postal_address ? "CAN-SPAM satisfied" : "Legally required — add below"} />
        <Check3 ok={settings.sending_enabled} label="Sending" detail={settings.sending_enabled ? `On · ${sentToday}/${settings.daily_cap} today` : "Off — nothing can go out"} />
      </div>

      {/* Sequence queue */}
      {queue && (
        <div className="rounded-xl border bg-card p-5">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold">Queue</h2>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Runs hourly on its own. Approved demos join automatically.
              </p>
            </div>
            <button
              onClick={runNow}
              disabled={running}
              className="inline-flex h-9 items-center gap-2 rounded-lg border px-4 text-sm font-medium transition hover:bg-muted disabled:opacity-40"
            >
              <Play className="h-3.5 w-3.5" />
              {running ? "Running…" : "Run now"}
            </button>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Stat n={queue.approvedDemos} label="Approved demos" />
            <Stat n={queue.enrolled} label="In sequence" />
            <Stat n={queue.dueNow} label="Due now" />
            <Stat n={queue.emailableLeads} label="Reachable leads" />
          </div>

          {queue.approvedDemos === 0 && (
            <p className="mt-4 rounded-lg bg-amber-50 px-3 py-2 text-xs leading-relaxed text-amber-900">
              Nothing can go out yet — no demo has been approved. Approve one in{" "}
              <a href="/admin/sites" className="font-medium underline">Generated Sites</a>{" "}
              and it joins the sequence on the next run.
            </p>
          )}

          {Object.keys(queue.nextStep).length > 0 && (
            <div className="mt-4 flex flex-wrap gap-2 border-t pt-4">
              {Object.entries(queue.nextStep).map(([step, n]) => (
                <span key={step} className="rounded-full bg-muted px-2.5 py-1 text-xs">
                  {n} due for step {step}
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Settings */}
      <div className="rounded-xl border bg-card p-5">
        <h2 className="mb-4 text-sm font-semibold">Sender</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="From name" hint="A person's name converts better cold than a company."
            value={settings.from_name} onSave={(v) => save({ from_name: v })} />
          <Field label="From address" hint="Must be on a domain verified in Resend."
            value={settings.from_email} onSave={(v) => save({ from_email: v })} />
          <Field label="Reply-to" hint="Where replies land. Must be monitored."
            value={settings.reply_to} onSave={(v) => save({ reply_to: v })} />
          <Field label="Daily cap" hint="Start at 10. Raise slowly — blasting a new domain gets it blacklisted."
            value={String(settings.daily_cap)} onSave={(v) => save({ daily_cap: Number(v) })} />
        </div>

        <div className="mt-4">
          <Field
            label="Postal address (required by law)"
            hint="Every commercial email must carry a physical address. A PO box is fine."
            value={settings.postal_address ?? ""}
            onSave={(v) => save({ postal_address: v })}
          />
        </div>

        <div className="mt-5 flex flex-wrap items-center gap-3 border-t pt-4">
          <button
            onClick={() => save({ sending_enabled: !settings.sending_enabled })}
            disabled={saving || (!settings.sending_enabled && !ready)}
            className={`inline-flex h-9 items-center gap-2 rounded-lg px-4 text-sm font-medium transition disabled:opacity-40 ${
              settings.sending_enabled
                ? "border text-muted-foreground hover:text-foreground"
                : "bg-emerald-600 text-white hover:bg-emerald-700"
            }`}
          >
            <Send className="h-4 w-4" />
            {settings.sending_enabled ? "Turn sending off" : "Turn sending on"}
          </button>
          {!ready && !settings.sending_enabled && (
            <span className="text-xs text-muted-foreground">
              Needs Resend connected and a postal address.
            </span>
          )}
          {msg && <span className="inline-flex items-center gap-1 text-xs text-emerald-700"><Check className="h-3 w-3" />{msg}</span>}
          {err && <span role="alert" className="inline-flex items-center gap-1 text-xs text-red-700"><AlertTriangle className="h-3 w-3" />{err}</span>}
        </div>
      </div>

      {/* Templates */}
      <div>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Sequence
        </h2>
        <div className="space-y-2">
          {templates.map((t) => (
            <div key={t.slug} className="rounded-xl border bg-card">
              <button
                onClick={() => setOpen(open === t.slug ? null : t.slug)}
                className="flex w-full items-start gap-3 px-5 py-4 text-left"
              >
                <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold">
                  {t.sequence_step ?? "—"}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-medium">{t.name}</span>
                  <span className="mt-0.5 block truncate font-mono text-xs text-muted-foreground">
                    {t.subject}
                  </span>
                </span>
                <Mail className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
              </button>
              {open === t.slug && (
                <div className="border-t px-5 py-4">
                  {t.description && (
                    <p className="mb-3 text-xs leading-relaxed text-muted-foreground">{t.description}</p>
                  )}
                  <pre className="max-h-80 overflow-auto whitespace-pre-wrap rounded-lg bg-muted/50 p-4 text-xs leading-relaxed">
{t.body_text}
                  </pre>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function Stat({ n, label }: { n: number; label: string }) {
  return (
    <div className="rounded-lg border bg-background px-3 py-2.5">
      <div className="text-xl font-semibold tabular-nums">{n}</div>
      <div className="mt-0.5 text-xs text-muted-foreground">{label}</div>
    </div>
  );
}

function Check3({ ok, label, detail }: { ok: boolean; label: string; detail: string }) {
  return (
    <div className={`rounded-xl border p-4 ${ok ? "border-emerald-200 bg-emerald-50" : "border-amber-200 bg-amber-50"}`}>
      <div className={`text-sm font-medium ${ok ? "text-emerald-800" : "text-amber-900"}`}>{label}</div>
      <div className={`mt-0.5 text-xs ${ok ? "text-emerald-700" : "text-amber-800"}`}>{detail}</div>
    </div>
  );
}

function Field({
  label, hint, value, onSave,
}: { label: string; hint: string; value: string; onSave: (v: string) => void }) {
  const [v, setV] = useState(value);
  useEffect(() => setV(value), [value]);
  const dirty = v !== value;
  return (
    <div>
      <label className="block text-xs font-medium text-muted-foreground">{label}</label>
      <div className="mt-1.5 flex gap-2">
        <input
          value={v}
          onChange={(e) => setV(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && dirty && onSave(v)}
          className="h-9 flex-1 rounded-lg border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
        />
        {dirty && (
          <button
            onClick={() => onSave(v)}
            className="h-9 shrink-0 rounded-lg bg-foreground px-3 text-xs font-medium text-background"
          >
            Save
          </button>
        )}
      </div>
      <p className="mt-1 text-[11px] leading-snug text-muted-foreground">{hint}</p>
    </div>
  );
}
