"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/admin/status-badge";
import { mockCustomers, mockInvoices } from "@/lib/mock-data";
import Link from "next/link";
import { notFound, useParams } from "next/navigation";

export default function CustomerDetailPage() {
  const params = useParams<{ customerId: string }>();
  const customer = mockCustomers.find((c) => c.id === params.customerId);
  if (!customer) notFound();

  const invoices = mockInvoices.filter((i) => i.customer_id === customer.id);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Link href="/admin/customers" className="text-sm text-muted-foreground hover:underline">← Back to Customers</Link>
          <h2 className="text-2xl font-bold text-slate-900">{customer.business_name}</h2>
          <p className="text-sm text-muted-foreground">{customer.industry} · {customer.email}</p>
        </div>
        <div className="flex gap-3">
          <Link href={`/admin/customers/${customer.id}/edit`}>
            <Button variant="outline">Edit</Button>
          </Link>
          <Button variant="destructive">Pause Subscription</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle>Business Info</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p><span className="text-muted-foreground">Phone:</span> {customer.phone}</p>
            <p><span className="text-muted-foreground">Address:</span> {customer.address_street}, {customer.address_city}, {customer.address_state} {customer.address_zip}</p>
            <p><span className="text-muted-foreground">Signed up:</span> {new Date(customer.created_at).toLocaleDateString()}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Website</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p><span className="text-muted-foreground">Demo:</span> <a href={customer.demo_url} className="text-primary hover:underline">{customer.demo_url}</a></p>
            <p><span className="text-muted-foreground">Live:</span> {customer.live_url ? <a href={customer.live_url} className="text-primary hover:underline">{customer.live_url}</a> : "Not deployed"}</p>
            <p><span className="text-muted-foreground">Hosting:</span> <StatusBadge status={customer.hosting_status} /></p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Financial</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p><span className="text-muted-foreground">Setup fee:</span> {customer.setup_fee_paid ? "Paid ($1,500)" : "Pending"}</p>
            <p><span className="text-muted-foreground">Monthly:</span> ${customer.monthly_payment}/mo</p>
            <p><span className="text-muted-foreground">Subscription:</span> <StatusBadge status={customer.subscription_status} /></p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Invoice History</CardTitle></CardHeader>
          <CardContent>
            {invoices.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4">No invoices yet.</p>
            ) : (
              <div className="space-y-2 text-sm">
                {invoices.map((inv) => (
                  <div key={inv.id} className="flex items-center justify-between">
                    <span>${inv.amount} · {new Date(inv.due_date).toLocaleDateString()}</span>
                    <StatusBadge status={inv.status} />
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}