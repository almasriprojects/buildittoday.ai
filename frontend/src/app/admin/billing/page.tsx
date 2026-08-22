"use client";

import { useEffect, useState } from "react";
import { StatCard } from "@/components/admin/stat-card";
import { EmptyPanel } from "@/components/admin/empty-panel";

type Overview = {
  customers: {
    total: number;
    active: number;
    recent: {
      id: string;
      business_name: string;
      subscription_status: string | null;
      hosting_status: string | null;
      created_at: string;
    }[];
  };
  revenue: { setupCollected: number; monthlyRecurring: number; monthlyFee: number };
};

const money = (n: number) =>
  n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });

export default function BillingPage() {
  const [d, setD] = useState<Overview | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/overview").then((r) => r.json()).then(setD).finally(() => setLoading(false));
  }, []);

  if (loading) return <p className="py-10 text-center text-sm text-muted-foreground">Loading…</p>;
  if (!d) return null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Billing</h1>
        <p className="mt-1 text-muted-foreground">Subscriptions and collected revenue.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Setup Collected" value={money(d.revenue.setupCollected)} hint="one-time fees" />
        <StatCard
          label="Monthly Recurring"
          value={money(d.revenue.monthlyRecurring)}
          hint={`${money(d.revenue.monthlyFee)} × ${d.customers.active} active`}
        />
        <StatCard label="Active Subscriptions" value={d.customers.active} />
      </div>

      {d.customers.total === 0 ? (
        <EmptyPanel
          title="No billing activity yet"
          body="Invoices and subscriptions appear here once a customer pays. Stripe is currently on test keys, so no live payment can complete."
          hint="Switching to live keys and adding the webhook secret is the last step before real money can move."
          action={{ href: "/admin/sites", label: "Review generated sites" }}
        />
      ) : (
        <div className="overflow-x-auto rounded-xl border bg-card">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-xs uppercase tracking-wide text-muted-foreground">
                <th className="px-4 py-3 font-medium">Customer</th>
                <th className="px-4 py-3 font-medium">Subscription</th>
                <th className="px-4 py-3 font-medium">Hosting</th>
                <th className="px-4 py-3 text-right font-medium">Monthly</th>
                <th className="px-4 py-3 font-medium">Since</th>
              </tr>
            </thead>
            <tbody>
              {d.customers.recent.map((c) => (
                <tr key={c.id} className="border-b last:border-0 hover:bg-muted/40">
                  <td className="px-4 py-3 font-medium">{c.business_name}</td>
                  <td className="px-4 py-3">{c.subscription_status ?? "—"}</td>
                  <td className="px-4 py-3">{c.hosting_status ?? "—"}</td>
                  <td className="px-4 py-3 text-right font-mono tabular-nums">
                    {c.subscription_status === "active" ? money(d.revenue.monthlyFee) : "—"}
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">
                    {new Date(c.created_at).toLocaleDateString()}
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
