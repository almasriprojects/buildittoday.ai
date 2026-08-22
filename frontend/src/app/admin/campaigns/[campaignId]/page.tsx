"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/admin/status-badge";
import { StatCard } from "@/components/admin/stat-card";
import { mockCampaigns } from "@/lib/mock-data";
import Link from "next/link";
import { notFound, useParams } from "next/navigation";

export default function CampaignDetailPage() {
  const params = useParams<{ campaignId: string }>();
  const campaign = mockCampaigns.find((c) => c.id === params.campaignId);
  if (!campaign) notFound();

  const responseRate = campaign.postcards_sent ? (campaign.qr_scans / campaign.postcards_sent) * 100 : 0;
  const conversionRate = campaign.qr_scans ? (campaign.conversions / campaign.qr_scans) * 100 : 0;
  const roi = campaign.cost ? (campaign.revenue - campaign.cost) / campaign.cost : 0;

  return (
    <div className="space-y-6">
      <div>
        <Link href="/admin/campaigns" className="text-sm text-muted-foreground hover:underline">← Back to Campaigns</Link>
        <h2 className="text-2xl font-bold text-slate-900">{campaign.name}</h2>
        <p className="text-sm text-muted-foreground">Sent {new Date(campaign.date_sent).toLocaleDateString()} · <StatusBadge status={campaign.status} /></p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard label="Postcards Sent" value={campaign.postcards_sent.toLocaleString()} />
        <StatCard label="QR Scans" value={campaign.qr_scans} hint={`${responseRate.toFixed(1)}% response rate`} />
        <StatCard label="Conversions" value={campaign.conversions} hint={`${conversionRate.toFixed(1)}% conversion rate`} />
        <StatCard label="Revenue" value={`$${campaign.revenue.toLocaleString()}`} hint={`${roi.toFixed(1)}x ROI`} />
      </div>

      <Card>
        <CardHeader><CardTitle>Campaign Details</CardTitle></CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p><span className="text-muted-foreground">Cost:</span> ${campaign.cost.toLocaleString()}</p>
          <p><span className="text-muted-foreground">Net profit:</span> ${(campaign.revenue - campaign.cost).toLocaleString()}</p>
          <p><span className="text-muted-foreground">Cost per postcard:</span> ${(campaign.cost / campaign.postcards_sent).toFixed(2)}</p>
          <p><span className="text-muted-foreground">Cost per acquisition:</span> ${campaign.conversions ? (campaign.cost / campaign.conversions).toFixed(2) : "—"}</p>
        </CardContent>
      </Card>
    </div>
  );
}