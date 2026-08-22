"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function AdminSettingsPage() {
  const [profile, setProfile] = useState({
    name: "Admin",
    email: "admin@buildwise.io",
  });
  const [billing, setBilling] = useState({
    defaultMonthly: "50",
    setupFee: "0",
    postcardCost: "0.50",
  });
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    // TODO: Save to API
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Settings</h1>
        <p className="text-sm text-muted-foreground">Manage your account and business preferences.</p>
      </div>

      {saved && (
        <div className="rounded-md bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-700">
          Settings saved successfully.
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Admin Profile</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700">Full name</label>
              <Input defaultValue="Admin User" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700">Email</label>
              <Input type="email" defaultValue="admin@buildpro.io" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700">Phone</label>
              <Input defaultValue="(555) 123-4567" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Notifications</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <label className="flex items-center gap-3 text-sm">
              <input type="checkbox" defaultChecked className="h-4 w-4 rounded border-gray-300" />
              New customer signup
            </label>
            <label className="flex items-center gap-3 text-sm">
              <input type="checkbox" defaultChecked className="h-4 w-4 rounded border-gray-300" />
              Website generated
            </label>
            <label className="flex items-center gap-3 text-sm">
              <input type="checkbox" className="h-4 w-4 rounded border-gray-300" />
              Payment received
            </label>
          </CardContent>
        </Card>

        <div className="flex justify-end">
          <Button onClick={() => setSaved(true)}>Save Changes</Button>
        </div>

        {saved && (
          <p className="text-sm text-green-600">Settings saved successfully.</p>
        )}
      </div>
    </div>
  );
}