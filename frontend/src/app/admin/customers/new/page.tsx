"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Link from "next/link";

const INDUSTRIES = [
  "Plumbing",
  "Dental",
  "Landscaping",
  "Accounting",
  "Real Estate",
  "Electrical",
  "HVAC",
  "Roofing",
  "Cleaning",
  "Restaurant",
  "Salon & Spa",
  "Auto Repair",
  "Other",
];

export default function NewCustomerPage() {
  const [form, setForm] = useState({
    businessName: "",
    industry: "",
    phone: "",
    email: "",
    addressStreet: "",
    addressCity: "",
    addressState: "FL",
    addressZip: "",
    monthlyPayment: "50",
    setupFeePaid: false,
    subscriptionStatus: "pending",
  });
  const [created, setCreated] = useState(false);

  const update = (key: string, value: string | boolean) => setForm((f) => ({ ...f, [key]: value }));

  const handleSubmit = () => {
    // TODO: Replace with real API call to /api/customers
    setCreated(true);
  };

  if (created) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <p className="text-5xl mb-4">🎉</p>
        <h2 className="text-2xl font-bold text-slate-900">Customer created!</h2>
        <p className="text-sm text-muted-foreground mt-2">The customer has been added to your account.</p>
        <div className="mt-6 flex gap-3">
          <Link href="/admin/customers"><Button variant="outline">Back to Customers</Button></Link>
          <Button onClick={() => { setCreated(false); setForm({ businessName: "", industry: "", phone: "", email: "", addressStreet: "", addressCity: "", addressState: "FL", addressZip: "", monthlyPayment: "50", setupFeePaid: false, subscriptionStatus: "pending" }); }}>+ Add Another</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <Link href="/admin/customers" className="text-sm text-muted-foreground hover:underline">← Back to Customers</Link>
        <h2 className="text-2xl font-bold text-slate-900">New Customer</h2>
        <p className="text-sm text-muted-foreground">Manually create a customer account.</p>
      </div>

      <Card>
        <CardHeader><CardTitle>Business Details</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-medium text-slate-700 block mb-1">Business Name *</label>
              <Input placeholder="e.g. Sunshine Plumbing" value={form.businessName} onChange={(e) => update("businessName", e.target.value)} />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-700 block mb-1">Industry</label>
              <select value={form.industry} onChange={(e) => update("industry", e.target.value)} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                <option value="">Select industry...</option>
                {INDUSTRIES.map((i) => <option key={i} value={i}>{i}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-slate-700 block mb-1">Phone *</label>
              <Input placeholder="(555) 123-4567" value={form.phone} onChange={(e) => update("phone", e.target.value)} />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-700 block mb-1">Email *</label>
              <Input type="email" placeholder="hello@business.com" value={form.email} onChange={(e) => update("email", e.target.value)} />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-700 block mb-1">Street Address</label>
              <Input placeholder="123 Main St" value={form.addressStreet} onChange={(e) => update("addressStreet", e.target.value)} />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-700 block mb-1">City</label>
              <Input placeholder="Orlando" value={form.addressCity} onChange={(e) => update("addressCity", e.target.value)} />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-700 block mb-1">State</label>
              <Input value={form.addressState} onChange={(e) => update("addressState", e.target.value)} />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-700 block mb-1">ZIP</label>
              <Input placeholder="32801" value={form.addressZip} onChange={(e) => update("addressZip", e.target.value)} />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Website & Subscription</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-xs font-medium text-slate-700 block mb-1">Monthly Payment ($)</label>
              <Input type="number" value={form.monthlyPayment} onChange={(e) => update("monthlyPayment", e.target.value)} />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-700 block mb-1">Subscription Status</label>
              <select value={form.subscriptionStatus} onChange={(e) => update("subscriptionStatus", e.target.value)} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                <option value="pending">Pending</option>
                <option value="active">Active</option>
                <option value="paused">Paused</option>
              </select>
            </div>
            <div className="flex items-end pb-2">
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.setupFeePaid}
                  onChange={(e) => update("setupFeePaid", e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary"
                />
                Setup fee paid ($1,500)
              </label>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={handleSubmit} disabled={!form.businessName || !form.phone || !form.email}>
          Create Customer
        </Button>
      </div>
    </div>
  );
}