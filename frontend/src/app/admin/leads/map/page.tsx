"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { StatusBadge } from "@/components/admin/status-badge";
import { MapPin, Loader2, RefreshCw, CheckCircle2, XCircle } from "lucide-react";
import type { Lead } from "@/lib/types";

// Load Leaflet map only on the client (avoids SSR "window is not defined" error)
const LeadsMap = dynamic(() => import("@/components/admin/leads-map").then((m) => m.LeadsMap), {
  ssr: false,
  loading: () => (
    <div className="w-full h-[70vh] min-h-[500px] flex items-center justify-center text-muted-foreground">
      <Loader2 className="w-5 h-5 animate-spin mr-2" />
      Loading map...
    </div>
  ),
});

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

// BATCH_SIZE must match the edge function (supabase/functions/geocode-leads)
const GEOCODE_BATCH_SIZE = 50;

// Safety cap: stop looping after this many batches to avoid an infinite loop.
// 200 batches × 50 leads = 10,000 leads — far beyond the current DB size.
const MAX_BATCHES = 200;

// How many times to retry a batch that fails/times out before giving up.
const MAX_BATCH_RETRIES = 3;

interface MapLeadRow {
  id: string;
  business_name: string;
  business_category?: string;
  target_fit?: string;
  street_address?: string;
  full_address?: string;
  city?: string;
  state?: string;
  zip?: string;
  latitude?: number;
  longitude?: number;
}

type GeocodeState = "idle" | "running" | "success" | "error";

function buildAddress(l: MapLeadRow): string {
  return [l.street_address || l.full_address, l.city, l.state, l.zip].filter(Boolean).join(", ");
}

function formatElapsed(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  if (m === 0) return `${s}s`;
  return `${m}m ${s.toString().padStart(2, "0")}s`;
}

export default function LeadsMapPage() {
  const [leads, setLeads] = useState<MapLeadRow[]>([]);
  const [total, setTotal] = useState(0);
  const [missingCoordinates, setMissingCoordinates] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Geocode feedback state
  const [geocodeState, setGeocodeState] = useState<GeocodeState>("idle");
  const [geocodeMessage, setGeocodeMessage] = useState<string | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [batchNumber, setBatchNumber] = useState(0);
  const [totalGeocoded, setTotalGeocoded] = useState(0);
  const geocodingRef = useRef(false); // guard against accidental double-clicks

  // Filters
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [targetFit, setTargetFit] = useState("all");

  const fetchLeads = useCallback(async (showLoading = true) => {
    if (showLoading) setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/leads/map?limit=100000");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load leads");
      setLeads(data.leads ?? []);
      setTotal(data.total ?? 0);
      setMissingCoordinates(data.missingCoordinates ?? 0);
    } catch (err: any) {
      setError(err.message || "Failed to load leads");
    } finally {
      if (showLoading) setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLeads();
  }, [fetchLeads]);

  // Live elapsed timer while geocoding is running
  useEffect(() => {
    if (geocodeState !== "running") return;
    setElapsedSeconds(0);
    const interval = setInterval(() => {
      setElapsedSeconds((s) => s + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [geocodeState]);

  // Filter leads
  const filteredLeads = useMemo(() => {
    return leads.filter((l) => {
      if (search) {
        const q = search.toLowerCase();
        const name = (l.business_name ?? "").toLowerCase();
        const addr = buildAddress(l).toLowerCase();
        if (!name.includes(q) && !addr.includes(q)) return false;
      }
      if (category !== "all" && l.business_category !== category) return false;
      if (targetFit !== "all" && l.target_fit !== targetFit) return false;
      return true;
    });
  }, [leads, search, category, targetFit]);

  // Build map leads (only those with coordinates)
  const mapLeads = useMemo(() => {
    return filteredLeads
      .filter((l) => l.latitude != null && l.longitude != null)
      .map((l) => ({
        id: l.id,
        business_name: l.business_name,
        business_category: l.business_category,
        target_fit: l.target_fit,
        address: buildAddress(l),
        lat: l.latitude!,
        lng: l.longitude!,
      }));
  }, [filteredLeads]);

  const runGeocode = async () => {
    // Guard: ignore if already running (prevents accidental double-clicks / multi-trigger)
    if (geocodingRef.current) return;
    geocodingRef.current = true;

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!supabaseUrl || !anonKey) {
      geocodingRef.current = false;
      setGeocodeState("error");
      setGeocodeMessage("Supabase env vars not configured");
      return;
    }

    // Reset progress
    setGeocodeState("running");
    setGeocodeMessage(null);
    setElapsedSeconds(0);
    setBatchNumber(0);
    setTotalGeocoded(0);

    let batch = 0;
    let cumulativeGeocoded = 0;
    let remaining = Infinity;

    try {
      // Loop until every lead is geocoded (or safety cap reached)
      while (remaining > 0 && batch < MAX_BATCHES) {
        batch++;
        setBatchNumber(batch);

        let data: any = null;
        let ok = false;
        let lastError: string | null = null;

        // Retry a batch up to MAX_BATCH_RETRIES times before giving up
        for (let attempt = 0; attempt < MAX_BATCH_RETRIES; attempt++) {
          try {
            const res = await fetch(`${supabaseUrl}/functions/v1/geocode-leads`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${anonKey}`,
                apikey: anonKey,
              },
            });
            const body = await res.json();
            if (!res.ok) throw new Error(body.error || "Geocoding failed");
            data = body;
            ok = true;
            break;
          } catch (err: any) {
            lastError = err.message || "Geocoding failed";
            // Brief pause before retry — gives the worker time to recover
            await new Promise((r) => setTimeout(r, 2000 * (attempt + 1)));
          }
        }

        if (!ok || !data) {
          // Stop looping — a batch failed after retries. Progress so far is preserved.
          throw new Error(lastError || "Geocoding failed after retries");
        }

        cumulativeGeocoded += Number(data.geocoded ?? 0);
        remaining = Number(data.remaining ?? 0);
        setTotalGeocoded(cumulativeGeocoded);

        // Small pause between batches so the edge function worker cools down
        await new Promise((r) => setTimeout(r, 500));
      }

      // Done — refresh the count then show the final banner
      await fetchLeads(false);
      if (remaining > 0 && batch >= MAX_BATCHES) {
        setGeocodeState("error");
        setGeocodeMessage(`Stopped after ${batch} batches (safety cap). ${remaining} leads still need coordinates.`);
      } else {
        setGeocodeState("success");
        setGeocodeMessage(
          `${cumulativeGeocoded} lead(s) geocoded in ${batch} batch(es). All remaining leads now have coordinates.`
        );
      }
    } catch (err: any) {
      // Refresh so the count reflects whatever progress was preserved
      fetchLeads(false);
      setGeocodeState("error");
      setGeocodeMessage(`${err.message || "Geocoding failed."} — ${cumulativeGeocoded} lead(s) were geocoded before the stop.`);
    } finally {
      geocodingRef.current = false;
    }
  };

  const isRunning = geocodeState === "running";

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <MapPin className="w-6 h-6 text-primary" />
            Leads Map
          </h2>
          <p className="text-sm text-muted-foreground">
            View all lead addresses on a map, color-coded by business category.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchLeads()}
            disabled={loading || isRunning}
            className="inline-flex items-center gap-1.5"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRunning ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <Button
            size="sm"
            onClick={runGeocode}
            disabled={isRunning || missingCoordinates === 0}
            className="inline-flex items-center gap-1.5 min-w-[190px] justify-center"
            title={
              isRunning
                ? `Geocoding in progress (${formatElapsed(elapsedSeconds)}) — please wait`
                : missingCoordinates === 0
                  ? "All leads have coordinates"
                  : `Geocode all remaining leads (${missingCoordinates} remaining) — runs automatically until done`
            }
          >
            {isRunning ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                Geocoding… Batch {batchNumber} · {formatElapsed(elapsedSeconds)}
              </>
            ) : (
              <>
                <MapPin className="w-3.5 h-3.5" />
                Geocode ({missingCoordinates} remaining)
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Geocode status banner — always visible so you know what's happening */}
      {geocodeState === "running" && (
        <div className="rounded-md border border-blue-300 bg-blue-50 px-4 py-3 text-sm text-blue-900">
          <div className="flex items-center gap-2 font-medium">
            <Loader2 className="w-4 h-4 animate-spin" />
            Geocoding in progress…
            <span className="ml-auto font-mono tabular-nums whitespace-nowrap">
              ⏱ {formatElapsed(elapsedSeconds)}
            </span>
          </div>
          <p className="text-xs text-blue-700 mt-1">
            Auto-processing all remaining leads — {totalGeocoded} geocoded so far across {batchNumber}{" "}
            batch(es) of {GEOCODE_BATCH_SIZE}. Please keep this page open; this runs until every lead has coordinates.
          </p>
          {/* Animated progress bar */}
          <div className="h-1.5 w-full mt-2 rounded-full bg-blue-200 overflow-hidden">
            <div className="h-full rounded-full bg-blue-600 progress-indeterminate" />
          </div>
        </div>
      )}

      {geocodeState === "success" && geocodeMessage && (
        <div className="rounded-md border border-emerald-300 bg-emerald-50 px-4 py-3 text-sm text-emerald-900 flex items-start gap-2">
          <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0 text-emerald-600" />
          <div>
            <span className="font-medium">Batch complete.</span> {geocodeMessage}
          </div>
        </div>
      )}

      {geocodeState === "error" && geocodeMessage && (
        <div className="rounded-md border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-900 flex items-start gap-2">
          <XCircle className="w-4 h-4 mt-0.5 shrink-0 text-red-600" />
          <div>
            <span className="font-medium">Geocoding failed.</span> {geocodeMessage}
            <span className="block text-xs text-red-700 mt-0.5">
              The remaining count has been refreshed — it may have partially completed. Try again.
            </span>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <Input
          placeholder="Search by business name or address..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-xs"
        />
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="rounded-md border border-input bg-background px-3 py-2 text-sm"
        >
          <option value="all">All categories</option>
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
        <select
          value={targetFit}
          onChange={(e) => setTargetFit(e.target.value)}
          className="rounded-md border border-input bg-background px-3 py-2 text-sm"
        >
          <option value="all">All target fit</option>
          <option value="yes">Yes</option>
          <option value="maybe">Maybe</option>
          <option value="no">No</option>
        </select>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => { setSearch(""); setCategory("all"); setTargetFit("all"); }}
          className="text-muted-foreground hover:text-slate-900"
        >
          Reset
        </Button>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      {loading ? (
        <div className="flex items-center justify-center py-16 text-muted-foreground">
          <Loader2 className="w-5 h-5 animate-spin mr-2" />
          Loading leads...
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Map — takes 3/4 width */}
          <div className="lg:col-span-3">
            <Card className="h-full">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <MapPin className="w-4 h-4" />
                  Map View
                  <span className="text-xs text-muted-foreground font-normal">
                    {mapLeads.length} of {filteredLeads.length} leads with coordinates
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="rounded-lg overflow-hidden border border-slate-200">
                  <LeadsMap
                    leads={mapLeads}
                    onSelect={(id) => { window.location.href = `/admin/leads/${id}`; }}
                  />
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  {total} total leads · {missingCoordinates} missing coordinates · click "Geocode" to geocode all remaining automatically.
                </p>
              </CardContent>
            </Card>
          </div>

          {/* List — takes 1/4 width */}
          <div>
            <Card className="h-full">
              <CardHeader>
                <CardTitle className="text-base">Leads ({filteredLeads.length})</CardTitle>
              </CardHeader>
              <CardContent className="max-h-[70vh] overflow-y-auto">
                {filteredLeads.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-8 text-center">No leads match your filters.</p>
                ) : (
                  <ul className="space-y-2">
                    {filteredLeads.map((l) => (
                      <li key={l.id}>
                        <button
                          type="button"
                          onClick={() => { window.location.href = `/admin/leads/${l.id}`; }}
                          className="w-full text-left rounded-lg border border-slate-200 px-3 py-2.5 hover:border-primary hover:bg-slate-50 transition-colors"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-medium text-sm truncate">{l.business_name}</span>
                            {l.latitude != null && l.longitude != null ? (
                              <MapPin className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                            ) : (
                              <span className="text-[10px] text-slate-400 shrink-0">no coords</span>
                            )}
                          </div>
                          <div className="text-xs text-muted-foreground mt-0.5 truncate">
                            {buildAddress(l) || "No address"}
                          </div>
                          <div className="flex items-center gap-2 mt-1.5">
                            <span className="text-[11px] text-slate-500">{l.business_category ?? "Uncategorized"}</span>
                            {l.target_fit && <StatusBadge status={l.target_fit} />}
                          </div>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}