"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { mockCustomers } from "@/lib/mock-data";
import Link from "next/link";
import { notFound, useParams } from "next/navigation";

export default function EditCustomerPage() {
  const params = useParams<{ customerId: string }>();
  const customer = mockCustomers.find((c) => c.id === params.customerId);
  if (!customer) notFound();

  const [form, setForm] = useState({
    businessName: customer.business_name,
    industry: customer.industry,
    phone: customer.phone,
    email: customer.email,
    addressStreet: customer.address_street ?? "",
    addressCity: customer.address_city ?? "",
    addressState: customer.address_state ?? "FL",
    addressZip: customer.address_zip ?? "",
  });
  const [saved, setSaved] = useState(false);

  const update = (key: string, value: string) => setForm((f) => ({ ...f, [key]: value }));

  return (
    <div className="space-y-6">
      <div>
        <Link href={`/admin/customers/${customer.id}`} className="text-sm text-muted-foreground hover:underline">← Back to Customer</Link>
        <h2 className="text-2xl font-bold text-slate-900">Edit {customer.business_name}</h2>
      </div>

      <Card>
        <CardHeader><CardTitle>Business Details</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          {saved && <div className="rounded-md bg-green-100 px-3 py-2 text-sm text-green-700">Changes saved.</div>}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-medium text-slate-700 block mb-1">Business Name</label>
              <Input value={form.businessName} onChange={(e) => update("businessName", e.target.value)} />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-700 block mb-1">Industry</label>
              <Input value={form.industry} onChange={(e) => update("industry", e.target.value)} />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-700 block mb-1">Phone</label>
              <Input value={form.phone} onChange={(e) => update("phone", e.target.value)} />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-700 block mb-1">Email</label>
              <Input type="email" value={form.email} onChange={(e) => update("email", e.target.value)} />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-700 block mb-1">Street</label>
              <Input value={form.addressStreet} onChange={(e) => update("addressStreet", e.target.value)} />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-700 block mb-1">City</label>
              <Input value={form.addressCity} onChange={(e) => update("addressCity", e.target.value)} />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-700 block mb-1">State</label>
              <Input value={form.addressState} onChange={(e) => update("addressState", e.target.value)} />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-700 block mb-1">ZIP</label>
              <Input value={form.addressZip} onChange={(e) => update("addressZip", e.target.value)} />
            </div>
          </div>
          <Button className="w-full" onClick={() => setSaved(true)}>Save Changes</Button>
        </CardContent>
      </Card>
    </div>
  );
}