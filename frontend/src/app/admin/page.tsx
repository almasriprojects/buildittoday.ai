import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatCard } from "@/components/admin/stat-card";
import { createServiceRoleClient } from "@/lib/supabase";
import Link from "next/link";

async function getDashboardData() {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return { configError: "SUPABASE_SERVICE_ROLE_KEY is not set in frontend/.env.local" as string | null, totalCustomers: 0, newLeads: 0, activeCustomers: 0, recentCustomers: [] as any[] };
  }

  const supabase = createServiceRoleClient();

  const [{ count: totalCustomers }, { count: newLeads }, { count: activeCustomers }, { data: recentCustomers }] =
    await Promise.all([
      supabase.from("customers").select("*", { count: "exact", head: true }),
      supabase.from("customers").select("*", { count: "exact", head: true }).eq("subscription_status", "pending"),
      supabase.from("customers").select("*", { count: "exact", head: true }).eq("subscription_status", "active"),
      supabase
        .from("customers")
        .select("id, business_name, created_at, subscription_status, hosting_status")
        .order("created_at", { ascending: false })
        .limit(10),
    ]);

  return {
    configError: null as string | null,
    totalCustomers: totalCustomers ?? 0,
    newLeads: newLeads ?? 0,
    activeCustomers: activeCustomers ?? 0,
    recentCustomers: recentCustomers ?? [],
  };
}

export default async function AdminDashboard() {
  const { configError, totalCustomers, newLeads, activeCustomers, recentCustomers } = await getDashboardData();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-900">Dashboard</h2>
        <p className="text-sm text-muted-foreground">Overview of your business.</p>
      </div>

      {configError && (
        <div className="mb-8 rounded-md bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {configError} — customer data can't load until it's set.
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <StatCard label="Total Customers" value={totalCustomers} />
        <StatCard label="New Leads" value={newLeads} />
        <StatCard label="Active Customers" value={activeCustomers} />
      </div>

      <Card>
        <CardHeader><CardTitle>Recent Customers</CardTitle></CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-2 font-medium text-muted-foreground">Business Name</th>
                  <th className="text-left py-3 px-2 font-medium text-muted-foreground">Signed Up</th>
                  <th className="text-left py-3 px-2 font-medium text-muted-foreground">Subscription</th>
                  <th className="text-left py-3 px-2 font-medium text-muted-foreground">Hosting</th>
                  <th className="text-right py-3 px-2 font-medium text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody>
                {recentCustomers.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-muted-foreground">No customers yet.</td>
                  </tr>
                ) : (
                  recentCustomers.map((c) => (
                    <tr key={c.id} className="border-b hover:bg-slate-50">
                      <td className="py-3 px-2 font-medium">{c.business_name}</td>
                      <td className="py-3 px-2 text-muted-foreground">{new Date(c.created_at).toLocaleDateString()}</td>
                      <td className="py-3 px-2">
                        <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${c.subscription_status === "active" ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"}`}>
                          {c.subscription_status}
                        </span>
                      </td>
                      <td className="py-3 px-2 text-muted-foreground">{c.hosting_status}</td>
                      <td className="py-3 px-2 text-right">
                        <Link href={`/admin/customers/${c.id}`}>
                          <Button variant="ghost" size="sm">View</Button>
                        </Link>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          <div className="mt-4">
            <Link href="/admin/customers">
              <Button variant="outline" size="sm">View All Customers</Button>
            </Link>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardContent className="pt-6">
            <h3 className="font-semibold mb-2">Generate Websites</h3>
            <p className="text-sm text-muted-foreground mb-4">Auto-generate demo sites for leads</p>
            <Link href="/admin/campaigns/new">
              <Button size="sm" className="w-full">Start Generator</Button>
            </Link>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <h3 className="font-semibold mb-2">Mail Postcards</h3>
            <p className="text-sm text-muted-foreground mb-4">Send postcard campaigns via Lob</p>
            <Link href="/admin/campaigns/new">
              <Button size="sm" className="w-full">Create Campaign</Button>
            </Link>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <h3 className="font-semibold mb-2">View Analytics</h3>
            <p className="text-sm text-muted-foreground mb-4">Track QR scans & conversions</p>
            <Link href="/admin/analytics">
              <Button size="sm" className="w-full">Open Analytics</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}