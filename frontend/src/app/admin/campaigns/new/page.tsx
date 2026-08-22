"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Link from "next/link";

const steps = ["Select Businesses", "Generate Websites", "Configure Postcard", "Review & Submit"];

export default function NewCampaignPage() {
  const [step, setStep] = useState(0);
  const [campaignName, setCampaignName] = useState("");
  const [industry, setIndustry] = useState("");
  const [location, setLocation] = useState("");
  const [selectedCount, setSelectedCount] = useState(0);
  const [generated, setGenerated] = useState(0);
  const [generating, setGenerating] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const startGeneration = () => {
    setGenerating(true);
    let count = 0;
    const timer = setInterval(() => {
      count += 25;
      setGenerated(count);
      if (count >= selectedCount) {
        clearInterval(timer);
        setGenerating(false);
      }
    }, 200);
  };

  if (submitted) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <p className="text-5xl mb-4">📬</p>
        <h2 className="text-2xl font-bold text-slate-900">Campaign submitted!</h2>
        <p className="text-sm text-muted-foreground mt-2">Postcards will be sent via Lob.</p>
        <div className="mt-6">
          <Link href="/admin/campaigns"><Button variant="outline">Back to Campaigns</Button></Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <Link href="/admin/campaigns" className="text-sm text-muted-foreground hover:underline">← Back to Campaigns</Link>
        <h2 className="text-2xl font-bold text-slate-900">New Campaign</h2>
      </div>

      {/* Step indicator */}
      <div className="flex items-center gap-2">
        {steps.map((s, i) => (
          <div key={s} className={`flex-1 rounded-md px-3 py-2 text-xs font-medium ${i === step ? "bg-primary text-white" : i < step ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-500"}`}>
            {i + 1}. {s}
          </div>
        ))}
      </div>

      <Card>
        <CardHeader><CardTitle>{steps[step]}</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          {step === 0 && (
            <>
              <div>
                <label className="text-xs font-medium text-slate-700 block mb-1">Campaign Name</label>
                <Input placeholder="e.g. August 2026 — Orlando Plumbers" value={campaignName} onChange={(e) => setCampaignName(e.target.value)} />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-medium text-slate-700 block mb-1">Industry</label>
                  <Input placeholder="e.g. Plumbing" value={industry} onChange={(e) => setIndustry(e.target.value)} />
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-700 block mb-1">Location</label>
                  <Input placeholder="e.g. Orlando, FL" value={location} onChange={(e) => setLocation(e.target.value)} />
                </div>
              </div>
              <div className="rounded-md bg-slate-50 px-4 py-3 text-sm">
                <p className="font-medium">Business List</p>
                <p className="text-muted-foreground text-xs mt-1">Upload a CSV or use filters to select businesses. Preview: <strong>{selectedCount || 0} businesses selected</strong></p>
                <div className="flex gap-3 mt-3">
                  <Button variant="outline" size="sm" onClick={() => setSelectedCount(500)}>Load Sample (500)</Button>
                  <Button variant="outline" size="sm" onClick={() => setSelectedCount(1000)}>Load Sample (1,000)</Button>
                </div>
              </div>
            </>
          )}

          {step === 1 && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">Generating demo websites for {selectedCount} businesses.</p>
              <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                <div className="h-full rounded-full bg-primary" style={{ width: `${selectedCount ? (generated / selectedCount) * 100 : 0}%` }} />
              </div>
              <p className="text-sm">{generated} / {selectedCount} websites generated</p>
              <Button onClick={startGeneration} disabled={generating || selectedCount === 0}>
                {generating ? "Generating..." : "Start Generation"}
              </Button>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <div className="rounded-2xl border p-6 max-w-sm mx-auto" style={{ backgroundColor: "#fff" }}>
                <p className="text-sm font-bold text-center">Your Website Is Ready!</p>
                <p className="text-xs text-muted-foreground text-center mt-2">Scan the QR code to see your new demo site.</p>
                <div className="w-24 h-24 mx-auto mt-4 rounded-md border-2 border-slate-900 flex items-center justify-center text-xs font-mono">QR</div>
                <p className="text-xs text-center mt-3">buildittoday.ai/demo/[businessId]</p>
              </div>
              <p className="text-sm text-muted-foreground">Front: Business name + "Your website is ready" + QR code. Back: Your phone + BuildItToday.ai</p>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-3 text-sm">
              <p><span className="text-muted-foreground">Campaign:</span> {campaignName || "Untitled"}</p>
              <p><span className="text-muted-foreground">Businesses:</span> {selectedCount}</p>
              <p><span className="text-muted-foreground">Postcard cost:</span> ${(selectedCount * 0.5).toLocaleString()}</p>
              <p><span className="text-muted-foreground">Timeline:</span> Delivery in 5-7 days</p>
            </div>
          )}

          <div className="flex items-center justify-between pt-4 border-t border-slate-200">
            <Button variant="outline" onClick={() => setStep((s) => Math.max(0, s - 1))} disabled={step === 0}>← Back</Button>
            {step < steps.length - 1 ? (
              <Button onClick={() => setStep((s) => Math.min(steps.length - 1, s + 1))}>Next →</Button>
            ) : (
              <Button onClick={() => setSubmitted(true)}>Submit Campaign</Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}