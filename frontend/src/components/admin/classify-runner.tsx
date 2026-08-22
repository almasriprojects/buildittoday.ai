"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Loader2, Play, CheckCircle2, AlertTriangle } from "lucide-react";

// A run stops after this many batches even if work remains — a guard against a
// server-side bug turning into an unbounded spend loop.
const MAX_BATCHES = 60;
const MAX_RETRIES = 3;

type Progress = { unclassified: number; total: number; classified: number; qualified: number };

export function ClassifyRunner() {
  const [p, setP] = useState<Progress | null>(null);
  const [running, setRunning] = useState(false);
  const [batch, setBatch] = useState(0);
  const [done, setDone] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const cancelled = useRef(false);

  const refresh = useCallback(async () => {
    try {
      const r = await fetch("/api/leads/classify");
      setP(await r.json());
    } catch {
      /* progress is advisory — a failed poll shouldn't surface an error */
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    if (!running) return;
    const t = setInterval(() => setElapsed((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, [running]);

  async function run() {
    cancelled.current = false;
    setRunning(true);
    setError(null);
    setMessage(null);
    setBatch(0);
    setDone(0);
    setElapsed(0);

    let total = 0;
    let remaining = Infinity;
    let n = 0;

    try {
      while (remaining > 0 && n < MAX_BATCHES && !cancelled.current) {
        n++;
        setBatch(n);

        let ok = false;
        for (let attempt = 0; attempt < MAX_RETRIES && !cancelled.current; attempt++) {
          try {
            const res = await fetch("/api/leads/classify", { method: "POST" });
            const d = await res.json();
            if (!res.ok) throw new Error(d.error || `HTTP ${res.status}`);
            total += d.classified ?? 0;
            remaining = d.remaining ?? 0;
            setDone(total);
            await refresh();
            ok = true;
            break;
          } catch (e) {
            if (attempt === MAX_RETRIES - 1) {
              setError(
                `Batch ${n} failed after ${MAX_RETRIES} attempts: ${
                  e instanceof Error ? e.message : "unknown"
                }. ${total} lead(s) classified so far — progress is saved.`
              );
            }
            await new Promise((r) => setTimeout(r, 2000));
          }
        }
        if (!ok) break;
        // brief pause so the edge function worker isn't hammered back-to-back
        await new Promise((r) => setTimeout(r, 1500));
      }

      if (cancelled.current) {
        setMessage(`Stopped. ${total} lead(s) classified before cancelling.`);
      } else if (remaining > 0 && n >= MAX_BATCHES) {
        setMessage(
          `Stopped at the ${MAX_BATCHES}-batch safety cap. ${total} classified, ${remaining} still to go — click again to continue.`
        );
      } else if (!error) {
        setMessage(`Done — ${total} lead(s) classified. Nothing left unclassified.`);
      }
    } finally {
      setRunning(false);
      refresh();
    }
  }

  const fmt = (s: number) =>
    s < 60 ? `${s}s` : `${Math.floor(s / 60)}m ${String(s % 60).padStart(2, "0")}s`;

  return (
    <div className="rounded-xl border bg-card p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-sm font-semibold">Lead classification</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {p
              ? p.unclassified === 0
                ? `All ${p.total.toLocaleString()} leads classified · ${p.qualified.toLocaleString()} qualified`
                : `${p.unclassified.toLocaleString()} of ${p.total.toLocaleString()} leads still unclassified`
              : "Checking…"}
          </p>
        </div>

        {running ? (
          <button
            onClick={() => {
              cancelled.current = true;
            }}
            className="inline-flex h-9 items-center gap-2 rounded-lg border px-4 text-sm font-medium text-muted-foreground transition hover:text-foreground"
          >
            <Loader2 className="h-4 w-4 animate-spin" />
            Batch {batch} · {done.toLocaleString()} done · {fmt(elapsed)} — Stop
          </button>
        ) : (
          <button
            onClick={run}
            disabled={!p || p.unclassified === 0}
            className="inline-flex h-9 items-center gap-2 rounded-lg bg-foreground px-4 text-sm font-medium text-background transition hover:opacity-90 disabled:opacity-40"
          >
            <Play className="h-4 w-4" />
            {p && p.unclassified > 0
              ? `Classify all ${p.unclassified.toLocaleString()} — runs until done`
              : "Nothing to classify"}
          </button>
        )}
      </div>

      {p && p.total > 0 && (
        <div className="mt-4 h-1.5 w-full overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-emerald-500 transition-all duration-500"
            style={{ width: `${Math.round((p.classified / p.total) * 100)}%` }}
          />
        </div>
      )}

      {message && (
        <p className="mt-3 inline-flex items-start gap-1.5 text-sm text-emerald-700">
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
          {message}
        </p>
      )}
      {error && (
        <p role="alert" className="mt-3 inline-flex items-start gap-1.5 text-sm text-red-700">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          {error}
        </p>
      )}

      {running && (
        <p className="mt-3 text-xs text-muted-foreground">
          Each batch takes about two minutes. You can leave this page — the work continues
          server-side — but the loop only advances while this tab is open.
        </p>
      )}
    </div>
  );
}
