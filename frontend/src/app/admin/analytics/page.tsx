"use client";

import { useEffect, useState } from "react";
import { StatCard } from "@/components/admin/stat-card";
import { EmptyPanel } from "@/components/admin/empty-panel";

type Overview = {
  customers: { total: number; active: number };
  potential: { total: number; paid: number };
  pipeline: { leads: number; qualified: number; demosReady: number; demosApproved: number };
  funnel: {
    sent: number; opened: number; clicked: number;
    scanned: number; viewed: number; paid: number;
  };
  revenue: { setupCollected: number; monthlyRecurring: number };
};

const money = (n: number) =>
  n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });

export default function AnalyticsPage() {
  const [d, setD] = useState<Overview | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/overview").then((r) => r.json()).then(setD).finally(() => setLoading(false));
  }, []);

  if (loading) return <p className="py-10 text-center text-sm text-muted-foreground">Loading…</p>;
  if (!d) return null;

  const nothingSent = d.funnel.sent === 0 && d.funnel.scanned === 0 && d.funnel.viewed === 0;

  // Rates are only meaningful once there is a denominator. Showing "0.0%" off
  // zero sends reads as a real measurement of failure, which it is not.
  const rate = (num: number, den: number) => (den > 0 ? `${((num / den) * 100).toFixed(1)}%` : "—");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Analytics</h1>
        <p className="mt-1 text-muted-foreground">
          Live numbers from the pipeline. Every figure here is a real count.
        </p>
      </div>

      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Revenue
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="Setup Collected" value={money(d.revenue.setupCollected)} hint="$1,500 per customer" />
          <StatCard label="Monthly Recurring" value={money(d.revenue.monthlyRecurring)} hint="$50 per active customer" />
          <StatCard label="Customers" value={d.customers.total} hint="paid" />
          <StatCard label="Signed Up" value={d.potential.total} hint="claimed a demo" />
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Lead pipeline
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="Leads" value={d.pipeline.leads.toLocaleString()} hint="pulled from SunBiz" />
          <StatCard label="Qualified" value={d.pipeline.qualified.toLocaleString()} hint="target fit = yes" />
          <StatCard label="Demos Built" value={d.pipeline.demosReady} hint="ready to send" />
          <StatCard label="Approved" value={d.pipeline.demosApproved} hint="cleared review" />
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Outreach funnel
        </h2>
        {nothingSent ? (
          <EmptyPanel
            title="No outreach sent yet"
            body="Open, click, scan and conversion rates appear here once the first campaign goes out. Nothing has been sent, so there is nothing to measure."
            hint={`${d.pipeline.demosApproved} approved demo${
              d.pipeline.demosApproved === 1 ? "" : "s"
            } ready. Sending needs an email provider connected first.`}
            action={{ href: "/admin/sites", label: "Review generated sites" }}
          />
        ) : (
          <div className="overflow-x-auto rounded-xl border bg-card">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="px-4 py-3 font-medium">Stage</th>
                  <th className="px-4 py-3 text-right font-medium">Count</th>
                  <th className="px-4 py-3 text-right font-medium">Of sent</th>
                </tr>
              </thead>
              <tbody>
                {[
                  ["Sent", d.funnel.sent],
                  ["Opened", d.funnel.opened],
                  ["Clicked", d.funnel.clicked],
                  ["QR scanned", d.funnel.scanned],
                  ["Viewed demo", d.funnel.viewed],
                  ["Paid", d.funnel.paid],
                ].map(([label, n]) => (
                  <tr key={label as string} className="border-b last:border-0">
                    <td className="px-4 py-3">{label}</td>
                    <td className="px-4 py-3 text-right font-mono tabular-nums">{n as number}</td>
                    <td className="px-4 py-3 text-right font-mono tabular-nums text-muted-foreground">
                      {label === "Sent" ? "—" : rate(n as number, d.funnel.sent)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
