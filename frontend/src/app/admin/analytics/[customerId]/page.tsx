"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatCard } from "@/components/admin/stat-card";
import { mockCustomerAnalytics } from "@/lib/mock-data";
import Link from "next/link";
import { notFound, useParams } from "next/navigation";

export default function CustomerAnalyticsPage() {
  const params = useParams<{ customerId: string }>();
  const analytics = mockCustomerAnalytics.find((a) => a.customer_id === params.customerId);
  if (!analytics) notFound();

  return (
    <div className="space-y-6">
      <div>
        <Link href="/admin/analytics" className="text-sm text-muted-foreground hover:underline">← Back to Analytics</Link>
        <h2 className="text-2xl font-bold text-slate-900">{analytics.customer_name}</h2>
        <p className="text-sm text-muted-foreground">Per-customer website analytics.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard label="Total Visits" value={analytics.total_visits.toLocaleString()} />
        <StatCard label="Unique Visitors" value={analytics.unique_visitors.toLocaleString()} />
        <StatCard label="Page Views" value={analytics.page_views.toLocaleString()} />
        <StatCard label="Avg Time on Page" value={`${analytics.avg_time_on_page} min`} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle>Top Pages</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-3">
              {analytics.top_pages.map((p) => (
                <div key={p.page} className="flex items-center justify-between text-sm">
                  <span>{p.page}</span>
                  <span className="text-muted-foreground">{p.traffic}%</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Engagement</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p><span className="text-muted-foreground">Bounce rate:</span> {(analytics.bounce_rate * 100).toFixed(1)}%</p>
            <p><span className="text-muted-foreground">Form submissions:</span> {analytics.form_submissions}</p>
            <p><span className="text-muted-foreground">Phone clicks:</span> {analytics.phone_clicks}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle>Visitor Trend (Last 30 Days)</CardTitle></CardHeader>
        <CardContent>
          <div className="flex items-end gap-2 h-40">
            {analytics.visitor_trend.map((d) => (
              <div key={d.date} className="flex-1 flex flex-col items-center gap-1">
                <div className="w-full rounded-t bg-primary" style={{ height: `${(d.visits / Math.max(...analytics.visitor_trend.map((x) => x.visits))) * 100}%` }} />
                <span className="text-[10px] text-muted-foreground">{new Date(d.date).toLocaleDateString(undefined, { month: "short", day: "numeric" })}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}