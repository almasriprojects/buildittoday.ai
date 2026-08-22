"use client";

import { useState } from "react";
import { Check, MinusCircle, X } from "lucide-react";

type BulkStatus = "approved" | "skipped";

export function BulkBar({
  selected,
  onClear,
  onDone,
}: {
  selected: Set<string>;
  onClear: () => void;
  onDone: () => void;
}) {
  const [busy, setBusy] = useState<BulkStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<BulkStatus | null>(null);

  const n = selected.size;
  if (n === 0) return null;

  async function apply(status: BulkStatus) {
    setBusy(status);
    setError(null);
    try {
      const res = await fetch("/api/demo-sites/review-bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slugs: [...selected], status }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || "Bulk update failed.");
      // A partial failure must be visible, not silently look like success.
      if (d.missed?.length) {
        setError(`${d.updatedCount} updated, ${d.missed.length} could not be found.`);
        setBusy(null);
        setConfirm(null);
        return;
      }
      onDone();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setBusy(null);
      setConfirm(null);
    }
  }

  return (
    <div className="fixed inset-x-0 bottom-0 z-40 border-t bg-card/95 backdrop-blur">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-3 px-6 py-3">
        <span className="text-sm font-medium">
          {n} site{n > 1 ? "s" : ""} selected
        </span>

        {error && (
          <span role="alert" className="text-xs text-red-600">
            {error}
          </span>
        )}

        <div className="ml-auto flex items-center gap-2">
          {confirm ? (
            <>
              <span className="text-sm">
                {confirm === "approved" ? "Approve" : "Skip"} {n} site{n > 1 ? "s" : ""}?
              </span>
              <button
                onClick={() => apply(confirm)}
                disabled={busy !== null}
                className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-foreground px-4 text-sm font-medium text-background transition hover:opacity-90 disabled:opacity-50"
              >
                {busy ? "Working…" : "Yes, do it"}
              </button>
              <button
                onClick={() => setConfirm(null)}
                disabled={busy !== null}
                className="inline-flex h-9 items-center rounded-lg border px-3 text-sm font-medium text-muted-foreground transition hover:text-foreground"
              >
                Cancel
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => setConfirm("approved")}
                className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-emerald-600 px-4 text-sm font-medium text-white transition hover:bg-emerald-700"
              >
                <Check className="h-4 w-4" /> Approve {n}
              </button>
              <button
                onClick={() => setConfirm("skipped")}
                className="inline-flex h-9 items-center gap-1.5 rounded-lg border px-3 text-sm font-medium text-muted-foreground transition hover:text-foreground"
              >
                <MinusCircle className="h-4 w-4" /> Skip {n}
              </button>
              <button
                onClick={onClear}
                title="Clear selection"
                className="inline-flex h-9 w-9 items-center justify-center rounded-lg border text-muted-foreground transition hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </>
          )}
        </div>
      </div>
      <p className="border-t bg-muted/40 px-6 py-1.5 text-center text-[11px] text-muted-foreground">
        Reject and Regenerate stay per-site — they need a reason attached to each one.
      </p>
    </div>
  );
}
