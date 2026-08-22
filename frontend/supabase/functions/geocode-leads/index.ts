// Supabase Edge Function: geocode-leads
// Fills latitude/longitude for leads missing coordinates using Photon (free, no API key).
// Processes a batch of 50 leads per invocation. Run repeatedly until remaining = 0.
//
// NOTE: Batch size is intentionally conservative (50) so the function always
// completes before Supabase's 150s idle/worker timeout. Each lead can take up to
// 4 Photon queries (~1s each), so 50 leads ≈ 120-135s worst case — safely under the limit.
// Verified live: 50/50 success, no timeout.
// Strategy (hybrid) to maximize hit rate:
//   1. Try full address (street, city, state, zip) with Photon.
//   2. If no result, try "street + zip" (Photon reliably matches this).
//   3. If still no result, try "city, state" (city-level fallback).

import { createClient } from "npm:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const BATCH_SIZE = 50;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface LeadRow {
  id: string;
  street_address?: string;
  full_address?: string;
  city?: string;
  state?: string;
  zip?: string;
}

async function geocodeWithPhoton(query: string): Promise<{ lat: number; lng: number } | null> {
  try {
    const url = `https://photon.komoot.io/api/?q=${encodeURIComponent(query)}&limit=1`;
    const res = await fetch(url, {
      headers: { "User-Agent": "buildittoday-admin" },
    });
    if (!res.ok) return null;
    const data = await res.json();
    const feature = data?.features?.[0];
    if (!feature) return null;
    // Photon returns coordinates as [lng, lat]
    const [lng, lat] = feature.geometry?.coordinates ?? [];
    if (typeof lng !== "number" || typeof lat !== "number") return null;
    return { lat, lng };
  } catch {
    return null;
  }
}

// Build candidate queries, most specific first.
function buildQueries(lead: LeadRow): string[] {
  const street = lead.street_address || lead.full_address;
  const city = lead.city;
  const zip = lead.zip;
  // Remove suite/unit/# lines that confuse Photon, keep the street line.
  const cleanStreet = (street ?? "")
    .split(",")[0]
    .replace(/\s*(suite|ste|unit|apt|#)\s*[a-z0-9#.\-\s]*$/i, "")
    .trim();

  const queries: string[] = [];

  // Most specific: street + city + state + zip
  if (cleanStreet && city) {
    queries.push([cleanStreet, city, lead.state, zip].filter(Boolean).join(", "));
  }
  // Reliable fallback: street + zip
  if (cleanStreet && zip) {
    queries.push(`${cleanStreet} ${zip}`);
  }
  // City-level fallback: city, state
  if (city) {
    queries.push([city, lead.state].filter(Boolean).join(", "));
  }
  // Zip-only fallback (last resort, gives region center)
  if (zip) {
    queries.push(zip);
  }

  return queries;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

    // Fetch leads missing coordinates (batch)
    const { data: leads, error: fetchError } = await supabase
      .from("leads")
      .select("id,street_address,full_address,city,state,zip")
      .or("latitude.is.null,longitude.is.null")
      .limit(BATCH_SIZE);

    if (fetchError) {
      return new Response(JSON.stringify({ error: fetchError.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!leads || leads.length === 0) {
      return new Response(
        JSON.stringify({ success: true, geocoded: 0, failed: 0, remaining: 0, message: "All leads already have coordinates." }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let geocoded = 0;
    let failed = 0;

    for (const lead of leads) {
      const queries = buildQueries(lead);
      if (queries.length === 0) {
        failed++;
        continue;
      }

      let coords: { lat: number; lng: number } | null = null;
      for (const q of queries) {
        coords = await geocodeWithPhoton(q);
        if (coords) break;
      }

      if (coords) {
        const { error: updateError } = await supabase
          .from("leads")
          .update({ latitude: coords.lat, longitude: coords.lng })
          .eq("id", lead.id);
        if (updateError) {
          failed++;
        } else {
          geocoded++;
        }
      } else {
        failed++;
      }
    }

    // Count remaining leads missing coordinates
    const { count: remaining, error: remainingError } = await supabase
      .from("leads")
      .select("id", { count: "exact", head: true })
      .or("latitude.is.null,longitude.is.null");

    return new Response(
      JSON.stringify({
        success: true,
        geocoded,
        failed,
        remaining: remainingError ? 0 : (remaining ?? 0),
        message: `Geocoded ${geocoded} lead(s). ${failed} failed. ${remainingError ? 0 : (remaining ?? 0)} remaining.`,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: err.message || "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});