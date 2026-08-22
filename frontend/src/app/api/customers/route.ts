import { NextRequest, NextResponse } from "next/server";
import { createAnonClient, createServiceRoleClient } from "@/lib/supabase";

// GET - List all customers (admin-only; requires SUPABASE_SERVICE_ROLE_KEY)
export async function GET(request: NextRequest) {
  try {
    const supabase = createServiceRoleClient();
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const limit = parseInt(searchParams.get("limit") || "20");
    const page = parseInt(searchParams.get("page") || "1");

    let query = supabase
      .from("customers")
      .select("*", { count: "exact" })
      .order("created_at", { ascending: false })
      .range((page - 1) * limit, page * limit - 1);

    if (status) {
      query = query.eq("subscription_status", status);
    }

    const { data, error, count } = await query;

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      customers: data,
      total: count,
      page,
      limit,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

// POST - Create a new customer
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      businessName,
      industry,
      phone,
      email,
      addressStreet,
      addressCity,
      addressState,
      addressZip,
    } = body;

    // Validate required fields
    if (!businessName || !phone || !email) {
      return NextResponse.json(
        { error: "Business name, phone, and email are required" },
        { status: 400 }
      );
    }

    const supabase = createAnonClient();
    const demoUrl = `/demo/${Math.random().toString(36).substring(7)}`;

    // Anon key can only INSERT on this table (no SELECT policy), so don't
    // chain .select() here — PostgREST would need read access to return the
    // row and fail RLS even though the insert itself succeeded.
    const { error } = await supabase
      .from("customers")
      .insert([{
        business_name: businessName,
        industry,
        phone,
        email,
        address_street: addressStreet,
        address_city: addressCity,
        address_state: addressState || "FL",
        address_zip: addressZip,
        demo_url: demoUrl,
        hosting_status: "pending",
        subscription_status: "pending",
      }]);

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      customer: { businessName, industry, phone, email, demoUrl },
      message: "Customer created successfully",
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}