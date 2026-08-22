"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DataTable, type Column } from "@/components/admin/data-table";
import { StatusBadge } from "@/components/admin/status-badge";
import { StatCard } from "@/components/admin/stat-card";
import { mockCampaigns } from "@/lib/mock-data";
import type { Campaign } from "@/lib/types";
import Link from "next/link";

export default function CampaignsPage() {
  const totalSent = mockCampaigns.reduce((sum, c) => sum + c.postcards_sent, 0);
  const totalScans = mockCampaigns.reduce((sum, c) => sum + c.qr_scans, 0);
  const totalConversions = mockCampaigns.reduce((sum, c) => sum + c.conversions, 0);
  const totalRevenue = mockCampaigns.reduce((sum, c) => sum + c.revenue, 0);

  const columns: Column<Campaign>[] = [
    { key: "name", label: "Campaign", render: (c) => <span className="font-medium">{c.name}</span> },
    { key: "date_sent", label: "Date Sent", render: (c) => <span className="text-muted-foreground">{new Date(c.date_sent).toLocaleDateString()}</span> },
    { key: "postcards_sent", label: "Postcards" },
    { key: "qr_scans", label: "QR Scans" },
    { key: "conversions", label: "Conversions" },
    { key: "revenue", label: "Revenue", render: (c) => <span>${c.revenue.toLocaleString()}</span> },
    { key: "status", label: "Status", render: (c) => <StatusBadge status={c.status} /> },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Campaigns</h2>
          <p className="text-sm text-muted-foreground">Manage postcard campaigns.</p>
        </div>
        <Link href="/admin/campaigns/new">
          <Button>+ New Campaign</Button>
        </Link>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard label="Total Postcards Sent" value={totalSent.toLocaleString()} />
        <StatCard label="Total QR Scans" value={totalScans} />
        <StatCard label="Total Conversions" value={totalConversions} />
        <StatCard label="Total Revenue" value={`$${totalRevenue.toLocaleString()}`} />
      </div>

      <Card>
        <CardHeader><CardTitle>All Campaigns</CardTitle></CardHeader>
        <CardContent>
          <DataTable
            columns={columns}
            rows={mockCampaigns}
            emptyTitle="No campaigns yet"
            emptyDescription="Create your first postcard campaign to get started."
            onView={(c) => { window.location.href = `/admin/campaigns/${c.id}`; }}
          />
        </CardContent>
      </Card>
    </div>
  );
}