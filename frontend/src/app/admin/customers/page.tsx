"use client";

import { useEffect, useState } from "react";
import { StatCard } from "@/components/admin/stat-card";
import { EmptyPanel } from "@/components/admin/empty-panel";

type Overview = {
  customers: {
    total: number;
    active: number;
    pending: number;
    recent: {
      id: string;
      business_name: string;
      email: string | null;
      subscription_status: string | null;
      hosting_status: string | null;
      created_at: string;
    }[];
  };
  pipeline: { demosApproved: number };
};

export default function CustomersPage() {
  const [data, setData] = useState<Overview | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/overview")
      .then((r) => r.json())
      .then(setData)
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Customers</h1>
        <p className="mt-1 text-muted-foreground">Businesses that have paid and are live.</p>
      </div>

      {data && (
        <div className="grid gap-4 sm:grid-cols-3">
          <StatCard label="Total Customers" value={data.customers.total} hint="paid and onboarded" />
          <StatCard label="Active" value={data.customers.active} hint="subscription running" />
          <StatCard label="Pending" value={data.customers.pending} hint="awaiting setup" />
        </div>
      )}

      {loading && <p className="py-10 text-center text-sm text-muted-foreground">Loading…</p>}

      {!loading && data && data.customers.total === 0 && (
        <EmptyPanel
          title="No customers yet"
          body="Nobody has paid yet. Customers appear here automatically the moment a Stripe payment completes and the webhook links it back to the originating lead."
          hint={`${data.pipeline.demosApproved} demo site${
            data.pipeline.demosApproved === 1 ? " is" : "s are"
          } approved and ready to send. Outreach is the step between here and your first customer.`}
          action={{ href: "/admin/sites", label: "Review generated sites" }}
        />
      )}

      {!loading && data && data.customers.total > 0 && (
        <div className="overflow-x-auto rounded-xl border bg-card">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-xs uppercase tracking-wide text-muted-foreground">
                <th className="px-4 py-3 font-medium">Business</th>
                <th className="px-4 py-3 font-medium">Email</th>
                <th className="px-4 py-3 font-medium">Subscription</th>
                <th className="px-4 py-3 font-medium">Hosting</th>
                <th className="px-4 py-3 font-medium">Since</th>
              </tr>
            </thead>
            <tbody>
              {data.customers.recent.map((c) => (
                <tr key={c.id} className="border-b last:border-0 hover:bg-muted/40">
                  <td className="px-4 py-3 font-medium">{c.business_name}</td>
                  <td className="px-4 py-3 text-muted-foreground">{c.email ?? "—"}</td>
                  <td className="px-4 py-3">{c.subscription_status ?? "—"}</td>
                  <td className="px-4 py-3">{c.hosting_status ?? "—"}</td>
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
