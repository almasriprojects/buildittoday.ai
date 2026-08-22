"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DataTable, type Column } from "@/components/admin/data-table";
import { StatusBadge } from "@/components/admin/status-badge";
import { StatCard } from "@/components/admin/stat-card";
import { mockCustomers } from "@/lib/mock-data";
import type { Customer } from "@/lib/types";
import Link from "next/link";

export default function CustomersPage() {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");

  const filtered = mockCustomers.filter((c) => {
    const matchesSearch = c.business_name.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = status === "all" || c.subscription_status === status;
    return matchesSearch && matchesStatus;
  });

  const columns: Column<Customer>[] = [
    { key: "business_name", label: "Business Name", render: (c) => <span className="font-medium">{c.business_name}</span> },
    { key: "industry", label: "Industry" },
    { key: "created_at", label: "Signed Up", render: (c) => <span className="text-muted-foreground">{new Date(c.created_at).toLocaleDateString()}</span> },
    { key: "subscription_status", label: "Subscription", render: (c) => <StatusBadge status={c.subscription_status} /> },
    { key: "hosting_status", label: "Hosting", render: (c) => <StatusBadge status={c.hosting_status} /> },
    { key: "monthly_payment", label: "Monthly", render: (c) => <span>${c.monthly_payment}/mo</span> },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Customers</h2>
          <p className="text-sm text-muted-foreground">Manage all customer accounts.</p>
        </div>
        <Link href="/admin/customers/new">
          <Button>+ New Customer</Button>
        </Link>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <StatCard label="Total Customers" value={mockCustomers.length} />
        <StatCard label="Active" value={mockCustomers.filter((c) => c.subscription_status === "active").length} />
        <StatCard label="Pending" value={mockCustomers.filter((c) => c.subscription_status === "pending").length} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Customers</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3 mb-4">
            <Input placeholder="Search by business name..." value={search} onChange={(e) => setSearch(e.target.value)} className="max-w-xs" />
            <select value={status} onChange={(e) => setStatus(e.target.value)} className="rounded-md border border-input bg-background px-3 py-2 text-sm">
              <option value="all">All statuses</option>
              <option value="active">Active</option>
              <option value="pending">Pending</option>
              <option value="paused">Paused</option>
              <option value="churned">Churned</option>
            </select>
          </div>
          <DataTable
            columns={columns}
            rows={filtered}
            emptyTitle="No customers found"
            emptyDescription="Try adjusting your search or filters."
            onView={(c) => { window.location.href = `/admin/customers/${c.id}`; }}
          />
        </CardContent>
      </Card>
    </div>
  );
}