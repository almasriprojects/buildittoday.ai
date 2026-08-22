"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatCard } from "@/components/admin/stat-card";
import { mockAnalytics } from "@/lib/mock-data";

export default function AnalyticsPage() {
  const a = mockAnalytics;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-900">Analytics</h2>
        <p className="text-sm text-muted-foreground">High-level business performance.</p>
      </div>

      <Card>
        <CardHeader><CardTitle>Revenue</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <StatCard label="Total Revenue" value={`$${a.total_revenue.toLocaleString()}`} />
            <StatCard label="Monthly Recurring" value={`$${a.monthly_recurring.toLocaleString()}/mo`} />
            <StatCard label="Projected ARR" value={`$${a.projected_arr.toLocaleString()}`} />
            <StatCard label="Churn Rate" value={`${(a.churn_rate * 100).toFixed(1)}%`} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Customer Lifecycle</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <StatCard label="New Customers" value={a.new_customers} />
            <StatCard label="Active Customers" value={a.active_customers} />
            <StatCard label="Churned" value={a.churned_customers} />
            <StatCard label="Lifetime Value" value={`$${a.ltv.toLocaleString()}`} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Campaign Performance</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <StatCard label="Postcards Sent" value={a.total_postcards_sent.toLocaleString()} />
            <StatCard label="Response Rate" value={`${(a.avg_response_rate * 100).toFixed(1)}%`} />
            <StatCard label="Conversion Rate" value={`${(a.avg_conversion_rate * 100).toFixed(1)}%`} />
            <StatCard label="CAC" value={`$${a.cac.toFixed(2)}`} />
          </div>
          <div className="mt-4 rounded-md bg-slate-50 px-4 py-3 text-sm">
            <p><span className="text-muted-foreground">ROI per postcard:</span> ${a.roi_per_postcard.toFixed(2)}</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Website Performance</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <StatCard label="Avg Load Time" value={`${a.avg_load_time}s`} />
            <StatCard label="Avg Monthly Visitors" value={a.avg_monthly_visitors.toLocaleString()} />
            <StatCard label="Avg Form Submissions" value={a.avg_form_submissions} />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}