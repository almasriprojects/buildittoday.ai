"use client";

// Client-side geocoding using Nominatim (OpenStreetMap) with localStorage caching.
// Each unique address is geocoded only once; subsequent loads read from cache.

const CACHE_KEY = "lead-geocode-cache-v1";
const CACHE_TTL = 1000 * 60 * 60 * 24 * 30; // 30 days

interface GeocodeResult {
  lat: number;
  lng: number;
  display_name?: string;
}

interface CacheEntry {
  result: GeocodeResult | null;
  cachedAt: number;
}

function readCache(): Record<string, CacheEntry> {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(CACHE_KEY);
    return raw ? (JSON.parse(raw) as Record<string, CacheEntry>) : {};
  } catch {
    return {};
  }
}

function writeCache(cache: Record<string, CacheEntry>) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
  } catch {
    // Ignore quota / privacy errors
  }
}

function isFresh(entry: CacheEntry): boolean {
  return Date.now() - entry.cachedAt < CACHE_TTL;
}

/**
 * Geocode a single address string. Returns cached result if available,
 * otherwise queries Nominatim. Returns null if geocoding fails.
 */
export async function geocodeAddress(address: string): Promise<GeocodeResult | null> {
  const key = address.trim().toLowerCase();
  if (!key) return null;

  const cache = readCache();
  const cached = cache[key];
  if (cached && isFresh(cached)) {
    return cached.result;
  }

  try {
    const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(address)}`;
    const res = await fetch(url, {
      headers: { "Accept-Language": "en" },
    });
    if (!res.ok) throw new Error(`Geocoding failed: ${res.status}`);
    const data = await res.json();
    const result: GeocodeResult | null =
      Array.isArray(data) && data.length > 0
        ? { lat: Number(data[0].lat), lng: Number(data[0].lon), display_name: data[0].display_name }
        : null;

    cache[key] = { result, cachedAt: Date.now() };
    writeCache(cache);
    return result;
  } catch {
    // Cache the failure briefly to avoid hammering the API
    cache[key] = { result: null, cachedAt: Date.now() };
    writeCache(cache);
    return null;
  }
}

/**
 * Build a searchable address string from a lead's address fields.
 */
export function buildAddressString(lead: {
  street_address?: string;
  full_address?: string;
  city?: string;
  state?: string;
  zip?: string;
}): string {
  const parts = [
    lead.street_address || lead.full_address,
    lead.city,
    lead.state,
    lead.zip,
  ].filter(Boolean);
  return parts.join(", ");
}

/**
 * Geocode a list of leads, respecting Nominatim's 1 req/sec rate limit.
 * Returns a map of leadId -> { lat, lng } for successfully geocoded leads.
 */
export async function geocodeLeads(
  leads: { id: string; street_address?: string; full_address?: string; city?: string; state?: string; zip?: string }[]
): Promise<Record<string, GeocodeResult>> {
  const results: Record<string, GeocodeResult> = {};
  const cache = readCache();

  // First pass: pull everything from cache
  const toGeocode: { id: string; address: string }[] = [];
  for (const lead of leads) {
    const address = buildAddressString(lead);
    if (!address) continue;
    const key = address.trim().toLowerCase();
    const cached = cache[key];
    if (cached && isFresh(cached) && cached.result) {
      results[lead.id] = cached.result;
    } else {
      toGeocode.push({ id: lead.id, address });
    }
  }

  // Second pass: geocode uncached addresses with rate limiting
  for (let i = 0; i < toGeocode.length; i++) {
    const { id, address } = toGeocode[i];
    const result = await geocodeAddress(address);
    if (result) results[id] = result;
    // Respect Nominatim's 1 request/second policy
    if (i < toGeocode.length - 1) {
      await new Promise((r) => setTimeout(r, 1100));
    }
  }

  return results;
}