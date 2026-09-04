"use client";

import { useCallback, useEffect, useState } from "react";
import { StatCard } from "@/components/admin/stat-card";

/**
 * Every business we hold, broken down by how we could actually reach it.
 *
 * The point of the page is the gap: SunBiz gives a name and an address for
 * everyone, and an email for almost nobody. A page that only showed totals
 * would hide that.
 */

type Bar = {
  label: string;
  email: number; phone: number; post: number; unreachable: number;
  total: number;
};
type Data = {
  dimension: string;
  bars: Bar[];
  totals: { all: number; email: number; phone: number; post: number; unreachable: number };
  options: {
    fit: { value: string; n: number }[];
    tier: { value: string; n: number }[];
    category: { value: string; n: number }[];
  };
};

const DIMENSIONS = [
  { key: "category", label: "Category" },
  { key: "county", label: "County" },
  { key: "city", label: "City" },
  { key: "entity", label: "Entity type" },
  { key: "fit", label: "Target fit" },
  { key: "tier", label: "Tier" },
];

// Reachability is a ladder — each lead sits in the cheapest channel open to
// it — so the colours run warm-to-cold in that same order.
const REACH = [
  { key: "email" as const, label: "Email", cls: "bg-emerald-500", dot: "bg-emerald-500",
    note: "Can go into the sequence today" },
  { key: "phone" as const, label: "Phone only", cls: "bg-amber-500", dot: "bg-amber-500",
    note: "No email — a call or a text" },
  { key: "post" as const, label: "Postcard only", cls: "bg-slate-400", dot: "bg-slate-400",
    note: "Address from the filing, nothing else" },
  { key: "unreachable" as const, label: "No route", cls: "bg-red-500", dot: "bg-red-500",
    note: "Not even an address on file" },
];

const n = (x: number) => x.toLocaleString("en-US");
const pct = (part: number, whole: number) =>
  whole > 0 ? `${((part / whole) * 100).toFixed(1)}%` : "—";

export default function InventoryPage() {
  const [d, setD] = useState<Data | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const [dimension, setDimension] = useState("category");
  const [fit, setFit] = useState("");
  const [tier, setTier] = useState("");
  const [category, setCategory] = useState("");
  // Volume and coverage are different questions and one bar length cannot
  // answer both: at 1.7% email overall, a segment scaled to volume is a
  // sliver you cannot compare across rows.
  const [mode, setMode] = useState<"count" | "share">("count");

  const load = useCallback(() => {
    setLoading(true);
    const q = new URLSearchParams({ dimension });
    if (fit) q.set("fit", fit);
    if (tier) q.set("tier", tier);
    if (category) q.set("category", category);

    fetch(`/api/admin/inventory?${q}`)
      .then((r) => r.json())
      .then((j) => {
        if (j.error) throw new Error(j.error);
        setD(j);
        setErr(null);
      })
      .catch((e) => setErr(e.message))
      .finally(() => setLoading(false));
  }, [dimension, fit, tier, category]);

  useEffect(() => { load(); }, [load]);

  const max = d ? Math.max(1, ...d.bars.map((b) => b.total)) : 1;
  const filtered = Boolean(fit || tier || category);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Lead inventory</h1>
        <p className="mt-1 text-muted-foreground">
          Every business pulled from SunBiz, and how you could actually reach each one.
        </p>
      </div>

      {err && (
        <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {err}
        </p>
      )}

      {d && (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              label="Businesses"
              value={n(d.totals.all)}
              hint={filtered ? "matching the filters below" : "everything on file"}
            />
            <StatCard
              label="Email on file"
              value={n(d.totals.email)}
              hint={`${pct(d.totals.email, d.totals.all)} — the only ones the sequence can reach`}
            />
            <StatCard
              label="Phone only"
              value={n(d.totals.phone)}
              hint={`${pct(d.totals.phone, d.totals.all)} — no email address`}
            />
            <StatCard
              label="Postcard only"
              value={n(d.totals.post)}
              hint={`${pct(d.totals.post, d.totals.all)} — address, and nothing else`}
            />
          </div>

          {/* Controls */}
          <div className="space-y-4 rounded-xl border bg-card p-5">
            <div>
              <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Break down by
              </p>
              <div className="flex flex-wrap gap-1.5">
                {DIMENSIONS.map((x) => (
                  <button
                    key={x.key}
                    onClick={() => setDimension(x.key)}
                    className={`h-8 rounded-lg border px-3 text-xs font-medium transition-colors ${
                      dimension === x.key
                        ? "border-transparent bg-accent-primary text-white"
                        : "hover:bg-muted"
                    }`}
                  >
                    {x.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <Select label="Target fit" value={fit} onChange={setFit}
                options={d.options.fit} anyLabel="Any fit" />
              <Select label="Tier" value={tier} onChange={setTier}
                options={d.options.tier} anyLabel="Any tier" />
              <Select label="Category" value={category} onChange={setCategory}
                options={d.options.category} anyLabel="Any category" />
              <div>
                <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
                  Bar length
                </label>
                <div className="flex gap-1.5">
                  {([["count", "Volume"], ["share", "Share"]] as const).map(([k, l]) => (
                    <button
                      key={k}
                      onClick={() => setMode(k)}
                      className={`h-9 flex-1 rounded-lg border text-xs font-medium transition-colors ${
                        mode === k ? "border-transparent bg-accent-primary text-white" : "hover:bg-muted"
                      }`}
                    >
                      {l}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {filtered && (
              <button
                onClick={() => { setFit(""); setTier(""); setCategory(""); }}
                className="text-xs font-medium text-accent-primary hover:underline"
              >
                Clear filters
              </button>
            )}
          </div>

          {/* Legend */}
          <div className="flex flex-wrap gap-x-6 gap-y-2 px-1">
            {REACH.map((r) => (
              <div key={r.key} className="flex items-center gap-2">
                <span className={`h-2.5 w-2.5 shrink-0 rounded-sm ${r.dot}`} />
                <span className="text-xs font-medium">{r.label}</span>
                <span className="text-xs text-muted-foreground">{r.note}</span>
              </div>
            ))}
          </div>

          {/* Bars */}
          <div className="rounded-xl border bg-card p-5">
            {loading ? (
              <p className="py-10 text-center text-sm text-muted-foreground">Loading…</p>
            ) : d.bars.length === 0 ? (
              <p className="py-10 text-center text-sm text-muted-foreground">
                Nothing matches those filters.
              </p>
            ) : (
              <div className="space-y-3.5">
                {d.bars.map((b) => {
                  // In Share mode every bar fills the row and the segments carry
                  // the meaning; in Volume mode the row length is the count.
                  const width = mode === "share" ? 100 : (b.total / max) * 100;
                  return (
                    <div key={b.label}>
                      <div className="mb-1 flex items-baseline justify-between gap-4">
                        <span className="truncate text-sm font-medium">{b.label}</span>
                        <span className="shrink-0 font-mono text-xs tabular-nums text-muted-foreground">
                          {n(b.total)}
                          {b.email > 0 && (
                            <span className="ml-2 text-emerald-600">{n(b.email)} email</span>
                          )}
                        </span>
                      </div>
                      <div className="h-5 w-full overflow-hidden rounded bg-muted">
                        <div className="flex h-full" style={{ width: `${width}%` }}>
                          {REACH.map((r) => {
                            const v = b[r.key];
                            if (v === 0) return null;
                            return (
                              <div
                                key={r.key}
                                className={r.cls}
                                // A real count must never render as nothing, so a
                                // non-zero segment keeps a visible minimum.
                                style={{
                                  width: `${(v / b.total) * 100}%`,
                                  minWidth: 2,
                                }}
                                title={`${r.label}: ${n(v)} (${pct(v, b.total)})`}
                              />
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <p className="px-1 text-xs leading-relaxed text-muted-foreground">
            Hover a segment for its exact count. Every lead is counted once, in the cheapest
            channel open to it — a business with both an email and a phone number sits under
            Email, not both.
          </p>
        </>
      )}

      {!d && loading && (
        <p className="py-10 text-center text-sm text-muted-foreground">Loading…</p>
      )}
    </div>
  );
}

function Select({
  label, value, onChange, options, anyLabel,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; n: number }[];
  anyLabel: string;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-xs font-medium text-muted-foreground">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-9 w-full rounded-lg border bg-background px-2 text-sm"
      >
        <option value="">{anyLabel}</option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.value} ({n(o.n)})
          </option>
        ))}
      </select>
    </div>
  );
}
