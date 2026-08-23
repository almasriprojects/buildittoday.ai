"use client";

import { useEffect, useState } from "react";
import { EmptyPanel } from "@/components/admin/empty-panel";

type ChannelStats = { reached: number; viewed: number; signed: number; paid: number };

type Pipeline = {
  byChannel: Record<string, ChannelStats>;
  funnelEvents: Record<string, Record<string, number>>;
  totals: { leadsReached: number; signups: number; signupsPaid: number };
};

const SETUP_FEE = 1500;

const LABEL: Record<string, string> = {
  email: "Email",
  postcard: "Postcard",
  direct: "Direct / unknown",
  web: "Website",
};

export default function AttributionPage() {
  const [d, setD] = useState<Pipeline | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/pipeline").then((r) => r.json()).then(setD).finally(() => setLoading(false));
  }, []);

  if (loading) return <p className="py-10 text-center text-sm text-muted-foreground">Loading…</p>;
  if (!d) return null;

  const channels = Object.entries(d.byChannel).sort((a, b) => b[1].reached - a[1].reached);
  const nothingYet = d.totals.leadsReached === 0;

  // Rates need a denominator to mean anything — "0.0%" off zero reach reads as
  // measured failure rather than an absence of data.
  const pct = (num: number, den: number) => (den > 0 ? `${((num / den) * 100).toFixed(1)}%` : "—");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Attribution</h1>
        <p className="mt-1 text-muted-foreground">
          Which channel actually produces customers — measured per lead, not per event.
        </p>
      </div>

      {nothingYet ? (
        <EmptyPanel
          title="Nothing to attribute yet"
          body="Once outreach goes out, this compares email against postcards at every step — reached, viewed their demo, signed up, paid — so you know where to spend."
          hint="Rates are computed from distinct leads rather than raw events, because one lead can scan a QR code several times."
          action={{ href: "/admin/sites", label: "Review generated sites" }}
        />
      ) : (
        <>
          <div className="overflow-x-auto rounded-xl border bg-card">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="px-4 py-3 font-medium">Channel</th>
                  <th className="px-4 py-3 text-right font-medium">Reached</th>
                  <th className="px-4 py-3 text-right font-medium">Viewed demo</th>
                  <th className="px-4 py-3 text-right font-medium">Signed up</th>
                  <th className="px-4 py-3 text-right font-medium">Paid</th>
                  <th className="px-4 py-3 text-right font-medium">Conversion</th>
                  <th className="px-4 py-3 text-right font-medium">Revenue</th>
                </tr>
              </thead>
              <tbody>
                {channels.map(([ch, s]) => (
                  <tr key={ch} className="border-b last:border-0 hover:bg-muted/40">
                    <td className="px-4 py-3 font-medium">{LABEL[ch] ?? ch}</td>
                    <td className="px-4 py-3 text-right font-mono tabular-nums">{s.reached}</td>
                    <td className="px-4 py-3 text-right font-mono tabular-nums">
                      {s.viewed}
                      <span className="ml-1.5 text-xs text-muted-foreground">{pct(s.viewed, s.reached)}</span>
                    </td>
                    <td className="px-4 py-3 text-right font-mono tabular-nums">{s.signed}</td>
                    <td className="px-4 py-3 text-right font-mono tabular-nums">{s.paid}</td>
                    <td className="px-4 py-3 text-right font-mono tabular-nums">{pct(s.paid, s.reached)}</td>
                    <td className="px-4 py-3 text-right font-mono tabular-nums">
                      ${(s.paid * SETUP_FEE).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {Object.keys(d.funnelEvents).length > 0 && (
            <div>
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                Raw events
              </h2>
              <div className="overflow-x-auto rounded-xl border bg-card">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left text-xs uppercase tracking-wide text-muted-foreground">
                      <th className="px-4 py-3 font-medium">Channel</th>
                      {["sent", "opened", "clicked", "scanned", "viewed", "signed_up", "paid"].map((e) => (
                        <th key={e} className="px-4 py-3 text-right font-medium">{e.replace("_", " ")}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(d.funnelEvents).map(([ch, ev]) => (
                      <tr key={ch} className="border-b last:border-0">
                        <td className="px-4 py-3 font-medium">{LABEL[ch] ?? ch}</td>
                        {["sent", "opened", "clicked", "scanned", "viewed", "signed_up", "paid"].map((e) => (
                          <td key={e} className="px-4 py-3 text-right font-mono tabular-nums text-muted-foreground">
                            {ev[e] ?? 0}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                Events can repeat per lead (one person may scan a QR code several times), which is
                why the table above counts distinct leads instead.
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
