"use client";

import { useCallback, useEffect, useState } from "react";
import { StatCard } from "@/components/admin/stat-card";
import { EmptyPanel } from "@/components/admin/empty-panel";

type Potential = {
  id: string;
  lead_id: string | null;
  demo_slug: string | null;
  email: string | null;
  full_name: string | null;
  source: string | null;
  status: string | null;
  converted_at: string | null;
  created_at: string;
};

const TONE: Record<string, string> = {
  new: "bg-amber-100 text-amber-800",
  paid: "bg-emerald-100 text-emerald-700",
  lost: "bg-muted text-muted-foreground",
};

export default function PotentialCustomersPage() {
  const [rows, setRows] = useState<Potential[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(() => {
    fetch("/api/admin/pipeline")
      .then((r) => r.json())
      .then((d) => setRows(d.potentialCustomers ?? []))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
    const onFocus = () => load();
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [load]);

  async function mark(id: string, status: "paid" | "lost") {
    setBusy(id);
    try {
      await fetch(`/api/potential-customers/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      load();
    } finally {
      setBusy(null);
    }
  }

  const paid = rows.filter((r) => r.status === "paid").length;
  const open = rows.filter((r) => r.status === "new").length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Sign-ups</h1>
        <p className="mt-1 text-muted-foreground">
          People who claimed a demo. These are the closest to becoming customers.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Open" value={open} hint="signed up, not yet paid" />
        <StatCard label="Converted" value={paid} hint="became customers" />
        <StatCard label="Total Sign-ups" value={rows.length} />
      </div>

      {loading && <p className="py-10 text-center text-sm text-muted-foreground">Loading…</p>}

      {!loading && rows.length === 0 && (
        <EmptyPanel
          title="No sign-ups yet"
          body="When someone claims their demo site, they appear here with the channel that brought them — so you can see which outreach is working."
          hint="Sign-ups start once outreach goes out."
          action={{ href: "/admin/sites", label: "Review generated sites" }}
        />
      )}

      {!loading && rows.length > 0 && (
        <div className="overflow-x-auto rounded-xl border bg-card">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-xs uppercase tracking-wide text-muted-foreground">
                <th className="px-4 py-3 font-medium">Who</th>
                <th className="px-4 py-3 font-medium">Source</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Signed up</th>
                <th className="px-4 py-3 text-right font-medium">Action</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-b last:border-0 hover:bg-muted/40">
                  <td className="px-4 py-3">
                    <div className="font-medium">{r.full_name ?? "—"}</div>
                    {r.email && (
                      <a href={`mailto:${r.email}`} className="text-xs text-primary underline-offset-4 hover:underline">
                        {r.email}
                      </a>
                    )}
                    {r.demo_slug && (
                      <div>
                        <a
                          href={`/admin/sites/${r.demo_slug}`}
                          className="text-xs text-muted-foreground underline-offset-4 hover:underline"
                        >
                          {r.demo_slug} →
                        </a>
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{r.source ?? "direct"}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${TONE[r.status ?? "new"]}`}>
                      {r.status ?? "new"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">
                    {new Date(r.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3">
                    {r.status !== "paid" && (
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => mark(r.id, "paid")}
                          disabled={busy === r.id}
                          className="inline-flex h-8 items-center rounded-md bg-emerald-600 px-2.5 text-xs font-medium text-white transition hover:bg-emerald-700 disabled:opacity-50"
                        >
                          Mark paid
                        </button>
                        <button
                          onClick={() => mark(r.id, "lost")}
                          disabled={busy === r.id}
                          className="inline-flex h-8 items-center rounded-md border px-2.5 text-xs font-medium text-muted-foreground transition hover:text-foreground disabled:opacity-50"
                        >
                          Lost
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
