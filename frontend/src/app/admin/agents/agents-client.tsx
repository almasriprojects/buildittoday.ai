"use client";

import { useCallback, useEffect, useState } from "react";
import { AlertTriangle, Check, Clock, Play, RefreshCw } from "lucide-react";

type Agent = {
  name: string; title: string; does: string; matters: string;
  schedule: string; cron: string; active: boolean;
  lastRun: string | null; lastStatus: string | null;
  runs24h: number; failures24h: number; canRunNow: boolean;
};
type Resp = { at: string; status: number | null; endpoint: string; body: string; ok: boolean };

const ago = (iso: string | null) => {
  if (!iso) return "never";
  const m = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
};

export function AgentsClient() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [recent, setRecent] = useState<Resp[]>([]);
  const [healthy, setHealthy] = useState(true);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [result, setResult] = useState<{ name: string; text: string; ok: boolean } | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const load = useCallback(() => {
    fetch("/api/admin/agents")
      .then((r) => r.json())
      .then((j) => {
        if (j.error) throw new Error(j.error);
        setAgents(j.agents ?? []);
        setRecent(j.recent ?? []);
        setHealthy(j.healthy);
      })
      .catch((e) => setErr(e.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  async function run(a: Agent) {
    setBusy(a.name); setErr(null); setResult(null);
    try {
      const res = await fetch("/api/admin/agents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: a.name }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error);
      setResult({
        name: a.title,
        ok: j.ok,
        text: JSON.stringify(j.result, null, 2).slice(0, 900),
      });
      load();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Could not run it.");
    } finally { setBusy(null); }
  }

  if (loading) return <p className="py-10 text-center text-sm text-muted-foreground">Loading…</p>;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Agents</h1>
          <p className="mt-1 text-muted-foreground">
            Everything that runs without you. Each one can be triggered by hand.
          </p>
        </div>
        <button onClick={load}
          className="inline-flex h-9 items-center gap-2 rounded-lg border px-3 text-xs font-medium hover:bg-muted">
          <RefreshCw className="h-3.5 w-3.5" /> Refresh
        </button>
      </div>

      <div className={`flex items-start gap-2 rounded-xl border p-4 text-sm ${
        healthy ? "border-emerald-200 bg-emerald-50 text-emerald-900"
                : "border-amber-200 bg-amber-50 text-amber-900"}`}>
        {healthy ? <Check className="mt-0.5 h-4 w-4 shrink-0" />
                 : <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />}
        <span>
          {healthy
            ? `All ${agents.length} agents active, no failures in the last 24 hours.`
            : "Something needs attention — see the failures below."}
        </span>
      </div>

      {err && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{err}</p>}

      {result && (
        <div className={`rounded-xl border p-4 ${
          result.ok ? "border-emerald-200 bg-emerald-50" : "border-amber-200 bg-amber-50"}`}>
          <p className="text-sm font-medium">{result.name} — what it returned</p>
          <pre className="mt-2 max-h-64 overflow-auto whitespace-pre-wrap rounded-lg bg-background/70 p-3 font-mono text-xs">
{result.text}
          </pre>
        </div>
      )}

      <div className="space-y-3">
        {agents.map((a) => (
          <div key={a.name} className="rounded-xl border bg-card p-5">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="font-semibold">{a.title}</h2>
                  {!a.active && (
                    <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-800">paused</span>
                  )}
                  {a.failures24h > 0 && (
                    <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-900">
                      {a.failures24h} failed
                    </span>
                  )}
                </div>
                <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{a.does}</p>
                <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground/80">{a.matters}</p>

                <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-xs text-muted-foreground">
                  <span className="inline-flex items-center gap-1">
                    <Clock className="h-3 w-3" /> {a.schedule}
                  </span>
                  <span>Last run {ago(a.lastRun)}</span>
                  <span>{a.runs24h} run{a.runs24h === 1 ? "" : "s"} in 24h</span>
                </div>
              </div>

              {a.canRunNow ? (
                <button onClick={() => run(a)} disabled={busy !== null}
                  className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-lg border px-3 text-xs font-medium hover:bg-muted disabled:opacity-40">
                  <Play className="h-3.5 w-3.5" />
                  {busy === a.name ? "Running…" : "Run now"}
                </button>
              ) : (
                <span className="shrink-0 text-xs text-muted-foreground">Runs on Supabase</span>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="rounded-xl border bg-card p-5">
        <h2 className="text-sm font-semibold">What the schedule actually got back</h2>
        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
          A job reports success once its request is queued, not once the endpoint answers — so a
          job can look healthy while its endpoint returns 500. These are the real replies.
        </p>
        {recent.length === 0 ? (
          <p className="mt-4 text-sm text-muted-foreground">Nothing recorded yet.</p>
        ) : (
          <div className="mt-4 space-y-1.5">
            {recent.map((r, i) => (
              <div key={i} className="flex items-start gap-3 rounded-lg border px-3 py-2 text-xs">
                <span className={`mt-0.5 shrink-0 rounded px-1.5 py-0.5 font-mono font-medium ${
                  r.ok ? "bg-emerald-100 text-emerald-800" : "bg-red-100 text-red-800"}`}>
                  {r.status ?? "—"}
                </span>
                <span className="w-40 shrink-0 truncate font-mono text-muted-foreground">{r.endpoint}</span>
                <span className="min-w-0 flex-1 truncate font-mono text-muted-foreground/80">{r.body}</span>
                <span className="shrink-0 text-muted-foreground">{ago(r.at)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
