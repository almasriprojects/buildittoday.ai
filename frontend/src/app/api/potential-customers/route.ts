import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase";

// GET /api/potential-customers — admin list of sign-ups with joined lead info.
// Returns potential_customers joined with the lead's business_name + document_number.
export async function GET() {
  try {
    const supabase = createServiceRoleClient();

    const { data, error } = await supabase
      .from("potential_customers")
      .select(
        "id, lead_id, demo_slug, email, full_name, source, status, converted_at, created_at, " +
        "leads(business_name, document_number)"
      )
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Flatten the joined lead fields for easy table rendering.
    const rows = (data ?? []).map((row: any) => ({
      id: row.id,
      lead_id: row.lead_id,
      demo_slug: row.demo_slug,
      email: row.email,
      full_name: row.full_name,
      source: row.source,
      status: row.status,
      converted_at: row.converted_at,
      created_at: row.created_at,
      business_name: row.leads?.business_name ?? null,
      document_number: row.leads?.document_number ?? null,
    }));

    return NextResponse.json({ potentialCustomers: rows });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}