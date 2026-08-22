"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { StatCard } from "@/components/admin/stat-card";
import { BulkBar } from "@/components/admin/sites-bulk-bar";
import type { GeneratedSite } from "@/app/api/demo-sites/route";

type Counts = {
  total: number; withVideo: number; fullQuality: number; noVideo: number;
  sent: number; unsent: number; viewed: number; reachable: number;
  approved: number; flagged: number;
};

type SentFilter = "all" | "unsent" | "sent";
type QualityFilter = "all" | "full" | "partial" | "none" | "flagged";
type ReviewFilter = "all" | "pending" | "approved" | "needs_regen" | "rejected" | "skipped";

const REVIEW_LABELS: Record<string, { text: string; tone: "good" | "mid" | "warn" | "muted" }> = {
  approved: { text: "approved", tone: "good" },
  needs_regen: { text: "regen", tone: "mid" },
  rejected: { text: "rejected", tone: "warn" },
  skipped: { text: "skipped", tone: "muted" },
};

export default function GeneratedSitesPage() {
  const [sites, setSites] = useState<GeneratedSite[]>([]);
  const [counts, setCounts] = useState<Counts | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [sent, setSent] = useState<SentFilter>("all");
  const [quality, setQuality] = useState<QualityFilter>("all");
  const [review, setReview] = useState<ReviewFilter>("all");
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const load = useCallback(() => {
    fetch("/api/demo-sites")
      .then((r) => r.json())
      .then((d) => {
        if (d.error) throw new Error(d.error);
        setSites(d.sites);
        setCounts(d.counts);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Returning from a review shouldn't show the status you just changed.
  useEffect(() => {
    const onFocus = () => load();
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [load]);

  const categories = useMemo(
    () => [...new Set(sites.map((s) => s.business_category).filter(Boolean))].sort() as string[],
    [sites]
  );

  const filtered = useMemo(
    () =>
      sites.filter((s) => {
        if (search && !s.business_name.toLowerCase().includes(search.toLowerCase())) return false;
        if (category !== "all" && s.business_category !== category) return false;
        const isSent = Boolean(s.outreach_sent_at || s.postcard_sent);
        if (sent === "unsent" && isSent) return false;
        if (sent === "sent" && !isSent) return false;
        if (quality === "full" && s.clip_count !== 3) return false;
        if (quality === "partial" && !(s.has_video && s.clip_count !== 3)) return false;
        if (quality === "none" && s.has_video) return false;
        if (quality === "flagged" && !(s.text_flags > 0 || !s.has_video || s.clip_count !== 3))
          return false;
        if (review !== "all" && s.review_status !== review) return false;
        return true;
      }),
    [sites, search, category, sent, quality, review]
  );

  // "Next" must mean next in what you were looking at, so the current filtered
  // order travels with the link rather than being re-derived on the other side.
  const navParam = useMemo(
    () => encodeURIComponent(filtered.map((s) => s.demo_slug).join(",")),
    [filtered]
  );

  const pendingCount = sites.filter((s) => s.review_status === "pending").length;
  const allVisibleSelected = filtered.length > 0 && filtered.every((s) => selected.has(s.demo_slug));

  function toggleAll() {
    setSelected((prev) => {
      const next = new Set(prev);
      if (allVisibleSelected) filtered.forEach((s) => next.delete(s.demo_slug));
      else filtered.forEach((s) => next.add(s.demo_slug));
      return next;
    });
  }

  function toggleOne(slug: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(slug)) next.delete(slug);
      else next.add(slug);
      return next;
    });
  }

  return (
    <div className="space-y-6 pb-24">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Generated Sites</h1>
        <p className="text-muted-foreground mt-1">
          Every lead that already has a demo page built. Preview before sending.
        </p>
      </div>

      {counts && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="Sites Built" value={counts.total} hint="demo pages ready" />
          <StatCard label="Not Reviewed" value={pendingCount} hint="still to decide on" />
          <StatCard label="Approved" value={counts.approved} hint="cleared to send" />
          <StatCard label="Needs a Look" value={counts.flagged} hint="quality flags" />
        </div>
      )}

      <div className="rounded-xl border bg-card">
        <div className="flex flex-wrap gap-3 border-b p-4">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by business name..."
            className="h-9 min-w-[200px] flex-1 rounded-md border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
          />
          <select
            value={review}
            onChange={(e) => setReview(e.target.value as ReviewFilter)}
            className="h-9 rounded-md border bg-background px-3 text-sm"
          >
            <option value="all">Any review state</option>
            <option value="pending">Not reviewed</option>
            <option value="approved">Approved</option>
            <option value="needs_regen">Needs regen</option>
            <option value="rejected">Rejected</option>
            <option value="skipped">Skipped</option>
          </select>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="h-9 rounded-md border bg-background px-3 text-sm"
          >
            <option value="all">All categories</option>
            {categories.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
          <select
            value={sent}
            onChange={(e) => setSent(e.target.value as SentFilter)}
            className="h-9 rounded-md border bg-background px-3 text-sm"
          >
            <option value="all">Sent &amp; unsent</option>
            <option value="unsent">Not yet sent</option>
            <option value="sent">Already sent</option>
          </select>
          <select
            value={quality}
            onChange={(e) => setQuality(e.target.value as QualityFilter)}
            className="h-9 rounded-md border bg-background px-3 text-sm"
          >
            <option value="all">Any quality</option>
            <option value="full">Full video (3 clips)</option>
            <option value="partial">Partial video</option>
            <option value="none">No video</option>
            <option value="flagged">⚠ Needs a look</option>
          </select>
        </div>

        {loading && <p className="p-8 text-center text-sm text-muted-foreground">Loading sites…</p>}
        {error && <p className="p-8 text-center text-sm text-red-600">{error}</p>}

        {!loading && !error && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="w-10 px-4 py-3">
                    <input
                      type="checkbox"
                      checked={allVisibleSelected}
                      onChange={toggleAll}
                      aria-label="Select all visible"
                      className="h-3.5 w-3.5 cursor-pointer"
                    />
                  </th>
                  <th className="px-4 py-3 font-medium">Business</th>
                  <th className="px-4 py-3 font-medium">Category</th>
                  <th className="px-4 py-3 font-medium">Quality</th>
                  <th className="px-4 py-3 font-medium">Review</th>
                  <th className="px-4 py-3 font-medium">Reachable</th>
                  <th className="px-4 py-3 font-medium">Sent</th>
                  <th className="px-4 py-3 text-right font-medium">Preview</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((s, i) => {
                  const isSent = Boolean(s.outreach_sent_at || s.postcard_sent);
                  const rl = REVIEW_LABELS[s.review_status];
                  return (
                    <tr
                      key={s.demo_slug}
                      className={`border-b last:border-0 hover:bg-muted/40 ${
                        selected.has(s.demo_slug) ? "bg-primary/5" : ""
                      }`}
                    >
                      <td className="px-4 py-3">
                        <input
                          type="checkbox"
                          checked={selected.has(s.demo_slug)}
                          onChange={() => toggleOne(s.demo_slug)}
                          aria-label={`Select ${s.business_name}`}
                          className="h-3.5 w-3.5 cursor-pointer"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-medium">{s.business_name}</div>
                        <div className="text-xs text-muted-foreground">
                          {[s.city, s.state].filter(Boolean).join(", ")} · {s.demo_slug}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{s.business_category ?? "—"}</td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1">
                          {!s.has_video ? (
                            <Pill tone="warn">no video</Pill>
                          ) : s.clip_count === 3 ? (
                            <Pill tone="good">3-clip</Pill>
                          ) : (
                            <Pill tone="mid">{s.clip_count}-clip</Pill>
                          )}
                          {s.text_flags > 0 && <Pill tone="warn">{s.text_flags}× text</Pill>}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {rl ? (
                          <Pill tone={rl.tone}>{rl.text}</Pill>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-1.5">
                          {s.has_email && <Pill tone="muted">email</Pill>}
                          {s.has_address && <Pill tone="muted">mail</Pill>}
                          {!s.has_email && !s.has_address && <Pill tone="warn">no contact</Pill>}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {s.demo_viewed_at ? (
                          <Pill tone="good">viewed</Pill>
                        ) : isSent ? (
                          <Pill tone="mid">sent</Pill>
                        ) : (
                          <Pill tone="muted">not sent</Pill>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-3">
                          <a
                            href={`/admin/sites/${s.demo_slug}?nav=${navParam}&i=${i}`}
                            className="font-medium text-primary underline-offset-4 hover:underline"
                          >
                            Preview →
                          </a>
                          <a
                            href={`/demo-sites/${s.demo_slug}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            title="Open the raw page in a new tab"
                            className="text-xs text-muted-foreground underline-offset-4 hover:underline"
                          >
                            raw
                          </a>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={8} className="px-4 py-12 text-center text-muted-foreground">
                      No sites match these filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {!loading && !error && (
          <div className="border-t px-4 py-3 text-xs text-muted-foreground">
            Showing {filtered.length} of {sites.length} generated sites
          </div>
        )}
      </div>

      <BulkBar
        selected={selected}
        onClear={() => setSelected(new Set())}
        onDone={() => {
          setSelected(new Set());
          load();
        }}
      />
    </div>
  );
}

function Pill({
  children,
  tone,
}: {
  children: React.ReactNode;
  tone: "good" | "mid" | "warn" | "muted";
}) {
  const tones = {
    good: "bg-emerald-100 text-emerald-700",
    mid: "bg-amber-100 text-amber-800",
    warn: "bg-red-100 text-red-700",
    muted: "bg-muted text-muted-foreground",
  };
  return (
    <span className={`inline-block rounded-full px-2 py-0.5 text-[11px] font-medium ${tones[tone]}`}>
      {children}
    </span>
  );
}
