"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/admin/status-badge";
import { PipelineStatus, type PipelineStep, type PipelineNotification } from "@/components/admin/pipeline-status";
import { MapPreview } from "@/components/admin/map-preview";
import { WebsitePreview } from "@/components/admin/website-preview";
import { cn } from "@/lib/utils";
import type { Lead } from "@/lib/types";

function Field({ label, value }: { label: string; value?: string | number | boolean | null }) {
  const display =
    value === null || value === undefined || value === ""
      ? "—"
      : typeof value === "boolean"
      ? value ? "Yes" : "No"
      : String(value);
  return (
    <div>
      <dt className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{label}</dt>
      <dd className="text-sm mt-0.5">{display}</dd>
    </div>
  );
}

const TABS = [
  { id: "overview", label: "Overview" },
  { id: "business", label: "Business & Owner" },
  { id: "contact", label: "Contact" },
  { id: "maps", label: "Maps" },
  { id: "website", label: "Website" },
] as const;

type TabId = (typeof TABS)[number]["id"];

export default function LeadDetailPage() {
  const params = useParams<{ leadId: string }>();
  const leadId = params.leadId;

  const [lead, setLead] = useState<Lead | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [processing, setProcessing] = useState<string | null>(null);
  const [processMessage, setProcessMessage] = useState<string | null>(null);
  const [notification, setNotification] = useState<PipelineNotification | null>(null);
  const [actionStartTime, setActionStartTime] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<TabId>("overview");

  const fetchLead = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/leads/${leadId}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load lead");
      setLead(data.lead);
    } catch (err: any) {
      setError(err.message || "Failed to load lead");
    } finally {
      setLoading(false);
    }
  }, [leadId]);

  useEffect(() => {
    fetchLead();
  }, [fetchLead]);

  const runAction = async (action: string) => {
    const actionLabel = action.charAt(0).toUpperCase() + action.slice(1) + (action === "skip" ? " Trace" : action === "maps" ? " Check" : "");
    const startedAt = new Date();
    const humanStart = startedAt.toLocaleTimeString();
    setProcessing(action);
    setProcessMessage(null);
    setActionStartTime(startedAt.getTime());

    // Immediate "Running" feedback so the user knows something is happening
    setNotification({
      type: "running",
      title: `Running: ${actionLabel}...`,
      detail: "Processing this lead. This may take a few seconds.",
      startedAt: humanStart,
    });

    try {
      const res = await fetch("/api/leads/process", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, leadId }),
      });
      const data = await res.json();

      // Actual reason if it failed — pulled from the edge function response
      const failedResult = data.results?.find((r: any) => !r.ok);
      const errorDetail = failedResult?.error || data.error || null;

      // Duration
      const durationMs = actionStartTime ? Date.now() - actionStartTime : Date.now() - (startedAt.getTime());
      const seconds = Math.max(1, Math.round(durationMs / 1000));
      const duration = `${seconds}s`;

      if (res.ok || !errorDetail) {
        setNotification({
          type: "success",
          title: `${actionLabel} completed`,
          detail: errorDetail || data.message || "Action finished successfully.",
          startedAt: humanStart,
          duration,
        });
      } else {
        setNotification({
          type: "error",
          title: `${actionLabel} failed`,
          detail: errorDetail,
          startedAt: humanStart,
          duration,
        });
      }

      setProcessMessage(data.message || (data.error ?? "Action finished."));
      fetchLead();
    } catch (err: any) {
      const durationMs = actionStartTime ? Date.now() - actionStartTime : 0;
      const seconds = Math.max(1, Math.round(durationMs / 1000));
      setNotification({
        type: "error",
        title: "Action failed",
        detail: err.message || "Network error — could not reach the server.",
        startedAt: humanStart,
        duration: `${seconds}s`,
      });
      setProcessMessage(err.message || "Action failed.");
    } finally {
      setProcessing(null);
      setActionStartTime(null);
    }
  };

  if (loading) {
    return <p className="text-sm text-muted-foreground py-8 text-center">Loading lead...</p>;
  }

  if (error || !lead) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-red-600">{error ?? "Lead not found."}</p>
        <Link href="/admin/leads" className="text-sm text-primary hover:underline">← Back to Leads</Link>
      </div>
    );
  }

  // Computed outreach recommendation for this lead
  const outreachRecommendation = (() => {
    const hasEmail = lead.contact_email && lead.contact_email.includes("@");
    const hasAddress = Boolean(lead.street_address || lead.full_address || lead.owner_mailing_address);
    if (lead.target_fit !== "yes") {
      return { title: "Not a target lead", detail: "This lead was classified as not a target. No outreach recommended.", tone: "text-slate-500 bg-slate-50 border-slate-200" as const };
    }
    if (lead.postcard_sent) {
      return { title: "Postcard already sent", detail: "This lead has already been sent a postcard.", tone: "text-slate-500 bg-slate-50 border-slate-200" as const };
    }
    if (hasEmail) {
      return {
        title: "Email lead",
        detail: `Send an email to ${lead.contact_email}${lead.site_generated ? " with their demo site link." : " — generate a demo site first."}`,
        tone: "text-blue-700 bg-blue-50 border-blue-200" as const,
      };
    }
    if (hasAddress) {
      return {
        title: "Postcard lead",
        detail: `No email on file — send a postcard with QR code to ${lead.street_address || lead.full_address || "business address"}${lead.site_generated ? "." : " — generate a demo site first."}`,
        tone: "text-amber-700 bg-amber-50 border-amber-200" as const,
      };
    }
    return { title: "No outreach available", detail: "No email or mailing address on file for this lead.", tone: "text-slate-500 bg-slate-50 border-slate-200" as const };
  })();

  const steps: PipelineStep[] = [
    { label: "Imported (SunBiz)", done: true },
    { label: "Classified", done: Boolean(lead.target_fit && lead.business_category) },
    // maps_checked = true means found on Maps; false means checked but not found.
    // Both are a completed check — only null/undefined means it hasn't been checked.
    { label: "Maps Check", done: lead.maps_checked !== null && lead.maps_checked !== undefined },
    { label: "Skip Traced", done: lead.contact_status === "matched" || lead.contact_status === "already_has_website", blocked: lead.contact_status === "new" && !lead.dataskip_checked },
    { label: "Site Generated", done: Boolean(lead.site_generated) },
    { label: "Postcard Sent", done: Boolean(lead.postcard_sent) },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link href="/admin/leads" className="text-sm text-primary hover:underline">← Back to Leads</Link>
          <h2 className="text-2xl font-bold text-slate-900 mt-1">{lead.business_name}</h2>
          <p className="text-sm text-muted-foreground">{lead.document_number} · {lead.entity_type_name ?? "—"}</p>
        </div>
      </div>

      {processMessage && (
        <div className="rounded-md border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800">
          {processMessage}
        </div>
      )}

      {/* Tabs + Sidebar layout */}
      <div className="flex flex-col lg:flex-row gap-6">
        {/* Main content */}
        <div className="flex-1 min-w-0">
          {/* Tab navigation */}
          <div className="flex gap-1 border-b border-slate-200 mb-6 overflow-x-auto">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "px-4 py-2 text-sm font-medium border-b-2 -mb-px whitespace-nowrap transition-colors",
                  activeTab === tab.id
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-slate-900"
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Overview tab */}
          {activeTab === "overview" && (
            <div className="space-y-6">
              {/* Recommended outreach */}
              <div className={`rounded-lg border px-4 py-3 ${outreachRecommendation.tone}`}>
                <p className="text-sm font-semibold">{outreachRecommendation.title}</p>
                <p className="text-xs mt-0.5 opacity-80">{outreachRecommendation.detail}</p>
              </div>

              {/* Status badges */}
              <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-3">
                <Card><CardContent className="pt-6"><p className="text-xs text-muted-foreground">Target Fit</p><div className="mt-1"><StatusBadge status={lead.target_fit ?? "—"} /></div></CardContent></Card>
                <Card><CardContent className="pt-6"><p className="text-xs text-muted-foreground">Contact Status</p><div className="mt-1"><StatusBadge status={lead.contact_status ?? "—"} /></div></CardContent></Card>
                <Card><CardContent className="pt-6"><p className="text-xs text-muted-foreground">Category</p><p className="text-sm font-medium mt-1">{lead.business_category ?? "—"}</p></CardContent></Card>
                <Card><CardContent className="pt-6"><p className="text-xs text-muted-foreground">Site Generated</p><div className="mt-1"><StatusBadge status={String(lead.site_generated ?? false)} /></div></CardContent></Card>
                <Card><CardContent className="pt-6"><p className="text-xs text-muted-foreground">Postcard</p><div className="mt-1"><StatusBadge status={String(lead.postcard_sent ?? false)} /></div></CardContent></Card>
                <Card><CardContent className="pt-6"><p className="text-xs text-muted-foreground">Lead Tier</p><p className="text-sm font-medium mt-1">{lead.lead_tier ?? "—"}</p></CardContent></Card>
              </div>

              {/* Classification reason */}
              {lead.classification_reason && (
                <Card>
                  <CardHeader><CardTitle className="text-base">Why this lead</CardTitle></CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">{lead.classification_reason}</p>
                  </CardContent>
                </Card>
              )}

              {/* Key contact summary */}
              <Card>
                <CardHeader><CardTitle className="text-base">Contact Summary</CardTitle></CardHeader>
                <CardContent>
                  <dl className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    <Field label="Contact Name" value={lead.contact_full_name} />
                    <Field label="Phone" value={lead.contact_phone} />
                    <Field label="Email" value={lead.contact_email} />
                    <Field label="City" value={lead.city} />
                    <Field label="State" value={lead.state_full ?? lead.state} />
                    <Field label="Filing Date" value={lead.filing_date} />
                  </dl>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Business & Owner tab */}
          {activeTab === "business" && (
            <div className="space-y-6">
              <Card>
                <CardHeader><CardTitle className="text-base">Business</CardTitle></CardHeader>
                <CardContent>
                  <dl className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    <Field label="Business Name" value={lead.business_name} />
                    <Field label="Document Number" value={lead.document_number} />
                    <Field label="Entity Type" value={lead.entity_type_name} />
                    <Field label="Status" value={lead.status} />
                    <Field label="Filing Date" value={lead.filing_date} />
                    <Field label="Source" value={lead.source} />
                    <Field label="Street Address" value={lead.street_address} />
                    <Field label="City" value={lead.city} />
                    <Field label="County" value={lead.county} />
                    <Field label="State" value={lead.state_full ?? lead.state} />
                    <Field label="Zip" value={lead.zip} />
                    <Field label="Full Address" value={lead.full_address} />
                  </dl>
                </CardContent>
              </Card>
              <Card>
                <CardHeader><CardTitle className="text-base">Owner</CardTitle></CardHeader>
                <CardContent>
                  <dl className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    <Field label="Owner Name" value={lead.owner_full_name} />
                    <Field label="Owner Title" value={lead.owner_title} />
                    <Field label="Backup Owner" value={lead.backup_owner_full_name} />
                    <Field label="Mailing Address" value={lead.owner_mailing_address} />
                    <Field label="Mailing City" value={lead.owner_mailing_city} />
                    <Field label="Mailing State" value={lead.owner_mailing_state} />
                    <Field label="Mailing Zip" value={lead.owner_mailing_zip} />
                    <Field label="Address Reliable" value={lead.owner_address_reliable} />
                  </dl>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Contact tab */}
          {activeTab === "contact" && (
            <Card>
              <CardHeader><CardTitle className="text-base">Skip-Trace Contact Info</CardTitle></CardHeader>
              <CardContent>
                <dl className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  <Field label="Contact Name" value={lead.contact_full_name} />
                  <Field label="Phone" value={lead.contact_phone} />
                  <Field label="Phone Type" value={lead.phone_type} />
                  <Field label="Email" value={lead.contact_email} />
                  <Field label="All Emails" value={lead.all_emails} />
                  <Field label="DNC" value={lead.contact_phone_dnc} />
                  <Field label="DataSkip Checked" value={lead.dataskip_checked} />
                  <Field label="Skip Trace Date" value={lead.skip_trace_checked_date} />
                  <Field label="DataSkip Credits" value={lead.dataskip_credits_charged} />
                </dl>
              </CardContent>
            </Card>
          )}

          {/* Maps tab */}
          {activeTab === "maps" && (
            <MapPreview
              address={lead.street_address}
              city={lead.city}
              state={lead.state_full ?? lead.state}
              zip={lead.zip}
              foundOnMaps={lead.found_on_maps}
              mapsPhone={lead.maps_phone}
              mapsWebsite={lead.maps_website}
              rating={lead.maps_rating}
              reviewCount={lead.maps_review_count}
              businessStatus={lead.maps_business_status}
            />
          )}

          {/* Website tab */}
          {activeTab === "website" && (
            <WebsitePreview
              demoSlug={lead.demo_slug}
              siteGenerated={lead.site_generated}
              onGenerate={() => runAction("generate")}
              generating={processing === "generate"}
            />
          )}
        </div>

        {/* Right sidebar */}
        <aside className="lg:w-72 shrink-0">
          <div className="lg:sticky lg:top-6 space-y-6">
            <Card>
              <CardContent className="pt-6">
                <PipelineStatus
                  steps={steps}
                  onAction={runAction}
                  processing={processing}
                  notification={notification}
                />
              </CardContent>
            </Card>
          </div>
        </aside>
      </div>
    </div>
  );
}