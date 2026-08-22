import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase";

// POST /api/leads/geocode — geocode a batch of leads missing coordinates and store them.
// Body: { batchSize?: number } (default 50)
// Returns the number of leads geocoded and how many remain.
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const batchSize = Math.min(Number(body.batchSize ?? "50"), 100);

    const supabase = createServiceRoleClient();

    // Fetch leads missing coordinates (up to batchSize)
    const { data: leads, error: fetchError } = await supabase
      .from("leads")
      .select(
        "id,street_address,full_address,city,state,zip"
      )
      .or("latitude.is.null,longitude.is.null")
      .limit(batchSize);

    if (fetchError) {
      return NextResponse.json({ error: fetchError.message }, { status: 500 });
    }

    if (!leads || leads.length === 0) {
      return NextResponse.json({
        success: true,
        geocoded: 0,
        remaining: 0,
        message: "All leads already have coordinates.",
      });
    }

    // Geocode each lead and store coordinates
    let geocoded = 0;
    const failures: string[] = [];

    for (let i = 0; i < leads.length; i++) {
      const lead = leads[i];
      const address = [lead.street_address || lead.full_address, lead.city, lead.state, lead.zip]
        .filter(Boolean)
        .join(", ");

      if (!address) {
        failures.push(lead.id);
        continue;
      }

      try {
        const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(address)}`;
        const res = await fetch(url, {
          headers: { "Accept-Language": "en", "User-Agent": "buildittoday-admin" },
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();

        if (Array.isArray(data) && data.length > 0) {
          const lat = Number(data[0].lat);
          const lng = Number(data[0].lon);
          if (!isNaN(lat) && !isNaN(lng)) {
            const { error: updateError } = await supabase
              .from("leads")
              .update({ latitude: lat, longitude: lng })
              .eq("id", lead.id);
            if (updateError) {
              failures.push(lead.id);
            } else {
              geocoded++;
            }
          } else {
            failures.push(lead.id);
          }
        } else {
          failures.push(lead.id);
        }
      } catch {
        failures.push(lead.id);
      }

      // Respect Nominatim's 1 request/second policy
      if (i < leads.length - 1) {
        await new Promise((r) => setTimeout(r, 1100));
      }
    }

    // Count remaining leads missing coordinates
    const { count: remaining, error: remainingError } = await supabase
      .from("leads")
      .select("id", { count: "exact", head: true })
      .or("latitude.is.null,longitude.is.null");

    return NextResponse.json({
      success: true,
      geocoded,
      failed: failures.length,
      remaining: remainingError ? 0 : (remaining ?? 0),
      message: `Geocoded ${geocoded} lead(s). ${failures.length} failed. ${remainingError ? 0 : (remaining ?? 0)} remaining.`,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}