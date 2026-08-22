"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DataTable, type Column } from "@/components/admin/data-table";
import { StatusBadge } from "@/components/admin/status-badge";
import { StatCard } from "@/components/admin/stat-card";
import { mockCustomers, mockInvoices } from "@/lib/mock-data";
import type { Invoice, Customer } from "@/lib/types";
import Link from "next/link";

export default function BillingPage() {
  const totalMonthly = mockCustomers
    .filter((c) => c.subscription_status === "active")
    .reduce((sum, c) => sum + c.monthly_payment, 0);

  const overdue = mockInvoices.filter((i) => i.status === "overdue");
  const pending = mockInvoices.filter((i) => i.status === "pending");
  const totalCollected = mockInvoices
    .filter((i) => i.status === "paid")
    .reduce((sum, i) => sum + i.amount, 0);

  const invoiceColumns: Column<Invoice>[] = [
    { key: "customer_name", label: "Customer", render: (i) => <span className="font-medium">{i.customer_name}</span> },
    { key: "amount", label: "Amount", render: (i) => <span>${i.amount.toFixed(2)}</span> },
    { key: "due_date", label: "Due Date", render: (i) => <span className="text-muted-foreground">{new Date(i.due_date).toLocaleDateString()}</span> },
    { key: "paid_date", label: "Paid Date", render: (i) => <span className="text-muted-foreground">{i.paid_date ? new Date(i.paid_date).toLocaleDateString() : "—"}</span> },
    { key: "status", label: "Status", render: (i) => <StatusBadge status={i.status} /> },
  ];

  const subscriptionColumns: Column<Customer>[] = [
    { key: "business_name", label: "Customer", render: (c) => <span className="font-medium">{c.business_name}</span> },
    { key: "monthly_payment", label: "Monthly", render: (c) => <span>${c.monthly_payment}/mo</span> },
    { key: "subscription_status", label: "Status", render: (c) => <StatusBadge status={c.subscription_status} /> },
    { key: "hosting_status", label: "Hosting", render: (c) => <StatusBadge status={c.hosting_status} /> },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-900">Billing</h2>
        <p className="text-sm text-muted-foreground">Financial tracking and invoices.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard label="Monthly Recurring" value={`$${totalMonthly}/mo`} />
        <StatCard label="Overdue Payments" value={overdue.length} hint={`$${overdue.reduce((s, i) => s + i.amount, 0).toFixed(2)} total`} />
        <StatCard label="Pending Invoices" value={pending.length} hint={`$${pending.reduce((s, i) => s + i.amount, 0).toFixed(2)} total`} />
        <StatCard label="Total Collected" value={`$${totalCollected.toFixed(2)}`} />
      </div>

      <Card>
        <CardHeader><CardTitle>Invoices</CardTitle></CardHeader>
        <CardContent>
          <DataTable
            columns={invoiceColumns}
            rows={mockInvoices}
            emptyTitle="No invoices yet"
            emptyDescription="Invoices will appear here once customers are billed."
            onView={(i) => {
              const customer = mockCustomers.find((c) => c.id === i.customer_id);
              if (customer) window.location.href = `/admin/customers/${customer.id}`;
            }}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Recurring Subscriptions</CardTitle></CardHeader>
        <CardContent>
          <DataTable
            columns={subscriptionColumns}
            rows={mockCustomers}
            emptyTitle="No subscriptions yet"
            emptyDescription="Customer subscriptions will appear here."
            onView={(c) => { window.location.href = `/admin/customers/${c.id}`; }}
          />
        </CardContent>
      </Card>
    </div>
  );
}