import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase";

// GET /api/leads/map — return all leads with their coordinates for the map view.
// Returns leads that have latitude/longitude set, plus counts of total/geocoded.
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = Math.min(Number(searchParams.get("limit") ?? "5000"), 100000);
    const offset = Number(searchParams.get("offset") ?? "0");

    const supabase = createServiceRoleClient();

    // Fetch leads that have coordinates
    const { data, error, count } = await supabase
      .from("leads")
      .select(
        "id,business_name,business_category,target_fit,street_address,full_address,city,state,zip,latitude,longitude,geo_precision",
        { count: "exact" }
      )
      .not("latitude", "is", null)
      .not("longitude", "is", null)
      .range(offset, offset + limit - 1);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Count total leads and leads missing coordinates
    const { count: totalCount, error: totalError } = await supabase
      .from("leads")
      .select("id", { count: "exact", head: true });

    const { count: missingCount, error: missingError } = await supabase
      .from("leads")
      .select("id", { count: "exact", head: true })
      .or("latitude.is.null,longitude.is.null");

    return NextResponse.json({
      leads: data ?? [],
      count: count ?? 0,
      total: totalError ? 0 : (totalCount ?? 0),
      missingCoordinates: missingError ? 0 : (missingCount ?? 0),
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}