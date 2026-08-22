"use client";

import { useEffect, useState } from "react";
import { StatCard } from "@/components/admin/stat-card";
import { EmptyPanel } from "@/components/admin/empty-panel";

type Overview = {
  pipeline: { demosReady: number; demosApproved: number };
  funnel: {
    sent: number; opened: number; clicked: number;
    scanned: number; viewed: number; paid: number;
  };
};

export default function CampaignsPage() {
  const [d, setD] = useState<Overview | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/overview").then((r) => r.json()).then(setD).finally(() => setLoading(false));
  }, []);

  if (loading) return <p className="py-10 text-center text-sm text-muted-foreground">Loading…</p>;
  if (!d) return null;

  const nothingSent = d.funnel.sent === 0 && d.funnel.scanned === 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Campaigns</h1>
        <p className="mt-1 text-muted-foreground">Email and postcard outreach to leads.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Approved to Send" value={d.pipeline.demosApproved} hint="cleared review" />
        <StatCard label="Sent" value={d.funnel.sent} hint="emails + postcards" />
        <StatCard label="Engaged" value={d.funnel.opened + d.funnel.scanned} hint="opened or scanned" />
        <StatCard label="Converted" value={d.funnel.paid} hint="paid customers" />
      </div>

      {nothingSent ? (
        <EmptyPanel
          title="No campaigns sent yet"
          body="Campaign performance appears here after the first send. Nothing has gone out, so there is nothing to report."
          hint={
            d.pipeline.demosApproved > 0
              ? `${d.pipeline.demosApproved} demo${d.pipeline.demosApproved === 1 ? " is" : "s are"} approved and waiting. Sending requires an email provider to be connected.`
              : `${d.pipeline.demosReady} demo sites are built but none approved yet. Review them before sending.`
          }
          action={{ href: "/admin/sites", label: "Review generated sites" }}
        />
      ) : (
        <div className="rounded-xl border bg-card p-6">
          <p className="text-sm text-muted-foreground">
            Per-campaign breakdown is not built yet — outreach is currently tracked in aggregate
            through <span className="font-mono text-xs">outreach_events</span>. See Analytics for
            the full funnel.
          </p>
        </div>
      )}
    </div>
  );
}
