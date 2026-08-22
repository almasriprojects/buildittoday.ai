"use client";

import { useCallback, useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DataTable, type Column, type SortDir } from "@/components/admin/data-table";
import { StatusBadge } from "@/components/admin/status-badge";
import { ArrowRight, MapPin } from "lucide-react";
import type { Lead } from "@/lib/types";
import { ClassifyRunner } from "@/components/admin/classify-runner";

interface LeadsResponse {
  leads: Lead[];
  count: number;
  todayPulled: boolean;
  unclassified: number;
  mapsPending: number;
  skipTracePending: number;
  skipTraceDone: number;
  outreachCounts?: {
    build: number;
    email: number;
    postcard: number;
  };
}

const CATEGORIES = [
  "Home & Trade Services",
  "Real Estate Investment",
  "Professional Services",
  "Financial Vehicle",
  "Retail & E-commerce",
  "Health & Wellness",
  "Food & Beverage",
  "Creative & Marketing",
  "Non-Profit",
  "Unclear",
];

function StatRow({
  label,
  value,
  onClick,
  active,
}: {
  label: string;
  value: string | number;
  onClick?: () => void;
  active?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!onClick}
      className={`flex items-center justify-between w-full rounded-lg border px-3 py-2.5 text-left transition-colors ${
        onClick
          ? active
            ? "border-primary bg-primary/5 cursor-pointer"
            : "border-slate-200 bg-card cursor-pointer hover:border-accent-primary"
          : "border-slate-200 bg-card"
      }`}
    >
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-base font-semibold text-slate-900 tabular-nums">{value}</span>
    </button>
  );
}

function ProgressRow({
  label,
  pct,
  hint,
}: {
  label: string;
  pct: number;
  hint: string;
}) {
  return (
    <div>
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">{label}</span>
        <span className="text-xs font-medium text-slate-900">{Math.round(pct)}%</span>
      </div>
      <div className="h-1.5 w-full mt-1 rounded-full bg-slate-200 overflow-hidden">
        <div
          className="h-full rounded-full bg-accent-primary transition-all"
          style={{ width: `${Math.min(100, Math.max(0, pct))}%` }}
        />
      </div>
      <p className="text-[11px] text-muted-foreground mt-0.5">{hint}</p>
    </div>
  );
}

export default function LeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [total, setTotal] = useState(0);
  const [todayPulled, setTodayPulled] = useState(false);
  const [unclassified, setUnclassified] = useState(0);
  const [mapsPending, setMapsPending] = useState(0);
  const [skipTracePending, setSkipTracePending] = useState(0);
  const [skipTraceDone, setSkipTraceDone] = useState(0);
  const [outreachCounts, setOutreachCounts] = useState({ build: 0, email: 0, postcard: 0 });
  const [channel, setChannel] = useState("all"); // all | build | email | postcard
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [search, setSearch] = useState("");
  const [targetFit, setTargetFit] = useState("all");
  const [category, setCategory] = useState("all");
  const [contactStatus, setContactStatus] = useState("all");
  const [siteGenerated, setSiteGenerated] = useState("all");

  // Sorting
  const [sortBy, setSortBy] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<SortDir | null>(null);

  // Header column filters
  const [filters, setFilters] = useState<Record<string, string>>({});

  // Pipeline actions
  const [processing, setProcessing] = useState<string | null>(null);
  const [processMessage, setProcessMessage] = useState<string | null>(null);

  const fetchLeads = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (targetFit !== "all") params.set("target_fit", targetFit);
      if (category !== "all") params.set("business_category", category);
      if (contactStatus !== "all") params.set("contact_status", contactStatus);
      if (siteGenerated !== "all") params.set("site_generated", siteGenerated);
      if (channel !== "all") params.set("channel", channel);
      if (sortBy) params.set("sort_by", sortBy);
      if (sortDir) params.set("sort_dir", sortDir);
      if (filters.contact_email) params.set("contact_email", filters.contact_email);
      if (filters.contact_full_name) params.set("contact_full_name", filters.contact_full_name);
      if (filters.city) params.set("city", filters.city);
      if (filters.business_category) params.set("business_category", filters.business_category);
      if (filters.target_fit) params.set("target_fit", filters.target_fit);
      if (filters.contact_status) params.set("contact_status", filters.contact_status);
      if (filters.site_generated) params.set("site_generated", filters.site_generated);

      const res = await fetch(`/api/leads?${params.toString()}`);
      const data: LeadsResponse = await res.json();
      if (!res.ok) throw new Error((data as any).error || "Failed to load leads");
      setLeads(data.leads ?? []);
      setTotal(data.count ?? 0);
      setTodayPulled(data.todayPulled ?? false);
      setUnclassified(data.unclassified ?? 0);
      setMapsPending(data.mapsPending ?? 0);
      setSkipTracePending(data.skipTracePending ?? 0);
      setSkipTraceDone(data.skipTraceDone ?? 0);
      setOutreachCounts(data.outreachCounts ?? { build: 0, email: 0, postcard: 0 });
    } catch (err: any) {
      setError(err.message || "Failed to load leads");
    } finally {
      setLoading(false);
    }
  }, [search, targetFit, category, contactStatus, siteGenerated, channel, sortBy, sortDir, filters]);

  useEffect(() => {
    const timer = setTimeout(fetchLeads, 300);
    return () => clearTimeout(timer);
  }, [fetchLeads]);

  const runPipeline = async (action: string) => {
    setProcessing(action);
    setProcessMessage(null);
    try {
      const res = await fetch("/api/leads/process", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const data = await res.json();
      setProcessMessage(data.message || (data.error ?? "Pipeline finished."));
      // Refresh the list after processing
      fetchLeads();
    } catch (err: any) {
      setProcessMessage(err.message || "Pipeline failed.");
    } finally {
      setProcessing(null);
    }
  };

  const columns: Column<Lead>[] = [
    {
      key: "business_name",
      label: "Business Name",
      sortable: true,
      sortKey: "business_name",
      render: (l) => (
        <div>
          <span className="font-medium">{l.business_name}</span>
          <span className="block text-xs text-muted-foreground">{l.document_number}</span>
        </div>
      ),
    },
    {
      key: "outreach_channel",
      label: "Outreach",
      render: (l) => {
        if (l.outreach_channel === "email") {
          return <span className="inline-flex items-center text-xs font-medium text-blue-700 bg-blue-50 border border-blue-200 rounded-full px-2 py-0.5">Email</span>;
        }
        if (l.outreach_channel === "postcard") {
          return <span className="inline-flex items-center text-xs font-medium text-amber-700 bg-amber-50 border border-amber-200 rounded-full px-2 py-0.5">Postcard</span>;
        }
        if (l.outreach_channel === "excluded") {
          return <span className="text-xs text-slate-400">—</span>;
        }
        return <span className="text-xs text-slate-400">—</span>;
      },
    },
    {
      key: "outreach_status",
      label: "Status",
      render: (l) => {
        if (l.outreach_status === "ready") {
          return <span className="inline-flex items-center text-xs font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-full px-2 py-0.5">Ready to Send</span>;
        }
        if (l.outreach_status === "site_needed") {
          return <span className="inline-flex items-center text-xs font-medium text-orange-700 bg-orange-50 border border-orange-200 rounded-full px-2 py-0.5">Site Needed</span>;
        }
        if (l.outreach_status === "sent") {
          return <span className="inline-flex items-center text-xs font-medium text-slate-600 bg-slate-50 border border-slate-200 rounded-full px-2 py-0.5">Sent</span>;
        }
        return <span className="text-xs text-slate-400">—</span>;
      },
    },
    {
      key: "business_category",
      label: "Category",
      sortable: true,
      sortKey: "business_category",
      filterable: true,
      filterKey: "business_category",
      filterOptions: CATEGORIES.map((c) => ({ value: c, label: c })),
      render: (l) => <span>{l.business_category ?? "—"}</span>,
    },
    {
      key: "target_fit",
      label: "Target Fit",
      sortable: true,
      sortKey: "target_fit",
      filterable: true,
      filterKey: "target_fit",
      filterOptions: [
        { value: "yes", label: "Yes" },
        { value: "maybe", label: "Maybe" },
        { value: "no", label: "No" },
      ],
      render: (l) => <StatusBadge status={l.target_fit ?? "—"} />,
    },
    {
      key: "contact_status",
      label: "Contact",
      sortable: true,
      sortKey: "contact_status",
      filterable: true,
      filterKey: "contact_status",
      filterOptions: [
        { value: "new", label: "New" },
        { value: "matched", label: "Matched" },
        { value: "already_has_website", label: "Already has website" },
      ],
      render: (l) => <StatusBadge status={l.contact_status ?? "—"} />,
    },
    {
      key: "contact_email",
      label: "Email",
      sortable: true,
      sortKey: "contact_email",
      filterable: true,
      filterKey: "contact_email",
      filterOptions: [
        { value: "has", label: "Has email" },
        { value: "none", label: "No email" },
      ],
      render: (l) => <span className="text-xs text-muted-foreground">{l.contact_email ?? "—"}</span>,
    },
    {
      key: "contact_full_name",
      label: "Contact",
      sortable: true,
      sortKey: "contact_full_name",
      filterable: true,
      filterKey: "contact_full_name",
      filterOptions: [
        { value: "has", label: "Has contact" },
        { value: "none", label: "No contact" },
      ],
      render: (l) => (
        <div>
          <span>{l.contact_full_name ?? "—"}</span>
          {l.contact_phone && <span className="block text-xs text-muted-foreground">{l.contact_phone}</span>}
        </div>
      ),
    },
    {
      key: "city",
      label: "Location",
      sortable: true,
      sortKey: "city",
      filterable: true,
      filterKey: "city",
      filterOptions: [
        { value: "has", label: "Has location" },
        { value: "none", label: "No location" },
      ],
      render: (l) => <span>{[l.city, l.state].filter(Boolean).join(", ") || "—"}</span>,
    },
    { key: "filing_date", label: "Filed", sortable: true, sortKey: "filing_date", render: (l) => <span className="text-muted-foreground">{l.filing_date ? new Date(l.filing_date).toLocaleDateString() : "—"}</span> },
    { key: "site_generated", label: "Site", sortable: true, sortKey: "site_generated", filterable: true, filterKey: "site_generated", filterOptions: [
      { value: "true", label: "Site generated" },
      { value: "false", label: "No site" },
    ], render: (l) => <StatusBadge status={String(l.site_generated ?? false)} /> },
  ];

  const stats = {
    total: total,
    unclassified: unclassified,
    mapsPending: mapsPending,
    skipTracePending: skipTracePending,
    targetYes: leads.filter((l) => l.target_fit === "yes").length,
    matched: leads.filter((l) => l.contact_status === "matched").length,
    sitesGenerated: leads.filter((l) => l.site_generated).length,
    postcardsSent: leads.filter((l) => l.postcard_sent).length,
  };

  // Classification progress: % of leads that have been classified
  const classifyProgress =
    total > 0 ? ((total - unclassified) / total) * 100 : 0;

  // Maps check progress: % of leads that have been checked on Google Maps
  const mapsProgress =
    total > 0 ? ((total - mapsPending) / total) * 100 : 0;

  // Skip-trace progress: % of leads that have contact info (matched or already has website)
  const skipTraceProgress =
    total > 0 ? (skipTraceDone / total) * 100 : 0;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-900">Leads</h2>
        <p className="text-sm text-muted-foreground">SunBiz leads pipeline — import, classify, enrich, and generate sites.</p>
      </div>

      {processMessage && (
        <div className="rounded-md border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800">
          {processMessage}
        </div>
      )}

      <ClassifyRunner />

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Main content */}
        <div className="flex-1 min-w-0 space-y-6">
          {/* Outreach channel tabs */}
          <div className="flex gap-1 border-b border-slate-200 pb-px">
            {[
              { id: "all", label: "All Leads" },
              { id: "build", label: `Build Queue (${outreachCounts.build})` },
              { id: "email", label: `Email (${outreachCounts.email})` },
              { id: "postcard", label: `Postcard (${outreachCounts.postcard})` },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setChannel(tab.id)}
                className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px whitespace-nowrap transition-colors ${
                  channel === tab.id
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-slate-900"
                }`}
              >
                {tab.label}
              </button>
            ))}
            <a
              href="/admin/leads/map"
              className="px-4 py-2 text-sm font-medium border-b-2 -mb-px whitespace-nowrap transition-colors border-transparent text-muted-foreground hover:text-slate-900 inline-flex items-center gap-1.5"
            >
              <MapPin className="w-3.5 h-3.5" />
              Map
            </a>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>All Leads</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-3 mb-4">
                <Input
                  placeholder="Search by business name..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="max-w-xs"
                />
                <select
                  value={targetFit}
                  onChange={(e) => {
                    const v = e.target.value;
                    setTargetFit(v);
                    setFilters((prev) => {
                      const next = { ...prev };
                      if (v === "all") delete next.target_fit;
                      else next.target_fit = v;
                      return next;
                    });
                  }}
                  className="rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="all">All target fit</option>
                  <option value="yes">Yes</option>
                  <option value="maybe">Maybe</option>
                  <option value="no">No</option>
                </select>
                <select
                  value={category}
                  onChange={(e) => {
                    const v = e.target.value;
                    setCategory(v);
                    setFilters((prev) => {
                      const next = { ...prev };
                      if (v === "all") delete next.business_category;
                      else next.business_category = v;
                      return next;
                    });
                  }}
                  className="rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="all">All categories</option>
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
                <select
                  value={contactStatus}
                  onChange={(e) => {
                    const v = e.target.value;
                    setContactStatus(v);
                    setFilters((prev) => {
                      const next = { ...prev };
                      if (v === "all") delete next.contact_status;
                      else next.contact_status = v;
                      return next;
                    });
                  }}
                  className="rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="all">All contact status</option>
                  <option value="new">New</option>
                  <option value="matched">Matched</option>
                  <option value="already_has_website">Already has website</option>
                </select>
                <select
                  value={siteGenerated}
                  onChange={(e) => {
                    const v = e.target.value;
                    setSiteGenerated(v);
                    setFilters((prev) => {
                      const next = { ...prev };
                      if (v === "all") delete next.site_generated;
                      else next.site_generated = v;
                      return next;
                    });
                  }}
                  className="rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="all">All sites</option>
                  <option value="true">Site generated</option>
                  <option value="false">No site</option>
                </select>
                {(sortBy || Object.keys(filters).length > 0) && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setSortBy(null);
                      setSortDir(null);
                      setFilters({});
                      setTargetFit("all");
                      setCategory("all");
                      setContactStatus("all");
                      setSiteGenerated("all");
                    }}
                    className="text-muted-foreground hover:text-slate-900"
                  >
                    Reset sort & filters
                  </Button>
                )}
              </div>

              {error && <p className="text-sm text-red-600 mb-4">{error}</p>}

              {loading ? (
                <p className="text-sm text-muted-foreground py-8 text-center">Loading leads...</p>
              ) : (
                <DataTable
                  columns={columns}
                  rows={leads}
                  emptyTitle="No leads found"
                  emptyDescription="Try adjusting your search or filters, or run the pipeline to import new SunBiz leads."
                  onRowClick={(l) => { window.location.href = `/admin/leads/${l.id}`; }}
                  sortBy={sortBy}
                  sortDir={sortDir}
                  onSortChange={(key, dir) => { setSortBy(key); setSortDir(dir); }}
                  filters={filters}
                  onFilterChange={(key, value) => {
                    setFilters((prev) => {
                      const next = { ...prev };
                      if (!value || value === "all") {
                        delete next[key];
                      } else {
                        next[key] = value;
                      }
                      return next;
                    });
                    // Sync header filters with the top filter bar state
                    if (key === "business_category") setCategory(value || "all");
                    if (key === "target_fit") setTargetFit(value || "all");
                    if (key === "contact_status") setContactStatus(value || "all");
                    if (key === "site_generated") setSiteGenerated(value || "all");
                  }}
                />
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right sidebar — stats + pipeline controls */}
        <aside className="lg:w-80 shrink-0">
          <div className="lg:sticky lg:top-6 space-y-6">
            <Card>
              <CardContent className="pt-6 space-y-6">
                <div>
                  <h3 className="text-sm font-semibold text-slate-900">Overview</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">Lead counts and pipeline status.</p>
                </div>

                {/* Stat rows */}
                <div className="space-y-2">
                  <StatRow label="Total Leads" value={stats.total} />
                  <StatRow label="Target Fit: Yes" value={stats.targetYes} />
                  <StatRow
                    label="Build Queue"
                    value={outreachCounts.build}
                    onClick={() => setChannel(channel === "build" ? "all" : "build")}
                    active={channel === "build"}
                  />
                  <StatRow
                    label="Email"
                    value={outreachCounts.email}
                    onClick={() => setChannel(channel === "email" ? "all" : "email")}
                    active={channel === "email"}
                  />
                  <StatRow
                    label="Postcard"
                    value={outreachCounts.postcard}
                    onClick={() => setChannel(channel === "postcard" ? "all" : "postcard")}
                    active={channel === "postcard"}
                  />
                  <StatRow label="Sites Generated" value={stats.sitesGenerated} />
                </div>

                <div className="border-t border-slate-200 pt-5">
                  <h4 className="text-xs font-semibold text-slate-900 uppercase tracking-wide mb-3">Pipeline Progress</h4>
                  <div className="space-y-4">
                    <ProgressRow label="Classification" pct={classifyProgress} hint={`${unclassified} unclassified`} />
                    <ProgressRow label="Maps Check" pct={mapsProgress} hint={`${mapsPending} pending`} />
                    <ProgressRow label="Skip Trace" pct={skipTraceProgress} hint={`${skipTraceDone} contact info found`} />
                  </div>
                </div>

                <div className="border-t border-slate-200 pt-5">
                  <h4 className="text-xs font-semibold text-slate-900 uppercase tracking-wide mb-3">Actions</h4>
                  <div className="space-y-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full justify-between"
                      onClick={() => runPipeline("pull")}
                      disabled={processing !== null || todayPulled}
                      title={todayPulled ? "Today's SunBiz file already downloaded" : "Download today's SunBiz file"}
                    >
                      {processing === "pull" ? "Pulling..." : todayPulled ? "Pulled Today" : "Pull SunBiz File"}
                      {processing !== "pull" && <ArrowRight className="w-3.5 h-3.5" />}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full justify-between"
                      onClick={() => runPipeline("classify")}
                      disabled={processing !== null || classifyProgress >= 100}
                      title={classifyProgress >= 100 ? "All leads classified" : "Classify remaining leads"}
                    >
                      {processing === "classify" ? "Classifying..." : "Classify Leads"}
                      {processing !== "classify" && <ArrowRight className="w-3.5 h-3.5" />}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full justify-between"
                      onClick={() => runPipeline("maps")}
                      disabled={processing !== null || mapsProgress >= 100}
                      title={mapsProgress >= 100 ? "All leads checked on Maps" : "Run Maps check on remaining leads"}
                    >
                      {processing === "maps" ? "Maps Checking..." : "Maps Check"}
                      {processing !== "maps" && <ArrowRight className="w-3.5 h-3.5" />}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full justify-between"
                      onClick={() => runPipeline("skip")}
                      disabled={processing !== null || skipTraceProgress >= 100}
                      title={skipTraceProgress >= 100 ? "All leads skip-traced" : "Run skip trace on remaining leads"}
                    >
                      {processing === "skip" ? "Skip Tracing..." : "Skip Trace"}
                      {processing !== "skip" && <ArrowRight className="w-3.5 h-3.5" />}
                    </Button>
                    <Button
                      size="sm"
                      className="w-full justify-between"
                      onClick={() => runPipeline("all")}
                      disabled={processing !== null}
                    >
                      {processing === "all" ? "Running..." : "Run Full Pipeline"}
                      {processing !== "all" && <ArrowRight className="w-3.5 h-3.5" />}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </aside>
      </div>
    </div>
  );
}
