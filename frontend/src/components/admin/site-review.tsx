"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, X, RefreshCw, MinusCircle } from "lucide-react";

export type ReviewStatus = "pending" | "approved" | "rejected" | "needs_regen" | "skipped";

const ACTIONS: {
  status: ReviewStatus;
  label: string;
  icon: typeof Check;
  className: string;
  needsNote?: boolean;
}[] = [
  {
    status: "approved",
    label: "Approve to send",
    icon: Check,
    className: "bg-emerald-600 text-white hover:bg-emerald-700",
  },
  {
    status: "needs_regen",
    label: "Regenerate",
    icon: RefreshCw,
    className: "border border-amber-500 text-amber-700 hover:bg-amber-50",
    needsNote: true,
  },
  {
    status: "rejected",
    label: "Reject",
    icon: X,
    className: "border border-red-400 text-red-700 hover:bg-red-50",
    needsNote: true,
  },
  {
    status: "skipped",
    label: "Skip lead",
    icon: MinusCircle,
    className: "border text-muted-foreground hover:bg-muted",
  },
];

const LABELS: Record<ReviewStatus, { text: string; cls: string }> = {
  pending: { text: "Not reviewed", cls: "bg-muted text-muted-foreground" },
  approved: { text: "Approved", cls: "bg-emerald-100 text-emerald-700" },
  needs_regen: { text: "Needs regeneration", cls: "bg-amber-100 text-amber-800" },
  rejected: { text: "Rejected", cls: "bg-red-100 text-red-700" },
  skipped: { text: "Skipped", cls: "bg-muted text-muted-foreground" },
};

export function SiteReview({
  slug,
  initialStatus,
  initialNote,
  reviewedAt,
  reviewedBy,
  nextHref,
}: {
  slug: string;
  initialStatus: ReviewStatus;
  initialNote: string | null;
  reviewedAt: string | null;
  reviewedBy: string | null;
  nextHref?: string | null;
}) {
  const router = useRouter();
  const [status, setStatus] = useState<ReviewStatus>(initialStatus);
  const [note, setNote] = useState(initialNote ?? "");
  const [meta, setMeta] = useState({ at: reviewedAt, by: reviewedBy });
  const [busy, setBusy] = useState<ReviewStatus | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function submit(next: ReviewStatus, needsNote?: boolean) {
    if (needsNote && !note.trim()) {
      setError("Add a short note explaining why — you'll want it later.");
      return;
    }
    setError(null);
    setBusy(next);
    try {
      const res = await fetch(`/api/demo-sites/${slug}/review`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: next, note }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not save that decision.");
      setStatus(data.review.review_status);
      setMeta({ at: data.review.reviewed_at, by: data.review.reviewed_by });
      // Deciding is the point — move straight on rather than making the
      // reviewer navigate back to the list to find the next one.
      if (nextHref) {
        setTimeout(() => router.push(nextHref), 350);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setBusy(null);
    }
  }

  const label = LABELS[status];

  return (
    <div className="rounded-xl border bg-card p-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Review
        </h2>
        <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${label.cls}`}>
          {label.text}
        </span>
      </div>

      <textarea
        value={note}
        onChange={(e) => setNote(e.target.value)}
        rows={2}
        placeholder="Note (required to reject or regenerate)"
        className="mb-3 w-full resize-y rounded-md border bg-background px-2.5 py-2 text-xs outline-none focus:ring-2 focus:ring-ring"
      />

      <div className="grid gap-2">
        {ACTIONS.map((a) => {
          const Icon = a.icon;
          const active = status === a.status;
          return (
            <button
              key={a.status}
              onClick={() => submit(a.status, a.needsNote)}
              disabled={busy !== null}
              className={`inline-flex h-9 items-center justify-center gap-1.5 rounded-lg px-3 text-xs font-medium transition disabled:opacity-50 ${a.className} ${
                active ? "ring-2 ring-offset-1 ring-current" : ""
              }`}
            >
              <Icon className={`h-3.5 w-3.5 ${busy === a.status ? "animate-spin" : ""}`} />
              {busy === a.status ? "Saving…" : a.label}
            </button>
          );
        })}
      </div>

      {error && (
        <p role="alert" className="mt-3 text-xs text-red-700">
          {error}
        </p>
      )}

      {meta.at && (
        <p className="mt-3 border-t pt-2.5 text-[11px] text-muted-foreground">
          {new Date(meta.at).toLocaleString()}
          {meta.by ? ` · ${meta.by}` : ""}
        </p>
      )}

      {status === "needs_regen" && (
        <p className="mt-2 rounded-md bg-amber-50 px-2.5 py-2 text-[11px] leading-relaxed text-amber-900">
          Flagged for the generation batch. This does not regenerate it now — the media pipeline runs
          separately and will pick this up.
        </p>
      )}
    </div>
  );
}
