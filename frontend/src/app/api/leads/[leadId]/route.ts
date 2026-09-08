import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase";
import { requireAdmin } from "@/lib/admin-auth";

// GET /api/leads/[leadId] — fetch a single lead by id
// Every handler below is admin-only. The middleware matcher covers /admin/*
// and never covered /api/*, so these answered 200 to anyone who asked: the
// lead table, the customer list, sign-ups, and the whole site inventory were
// readable without signing in. A page-level redirect is not authorisation.
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ leadId: string }> }
) {
  const gate = await requireAdmin();
  if (!gate.ok) return gate.response;

  try {
    const { leadId } = await params;
    const supabase = createServiceRoleClient();

    const { data, error } = await supabase
      .from("leads")
      .select("*")
      .eq("id", leadId)
      .maybeSingle();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    if (!data) {
      return NextResponse.json({ error: "Lead not found" }, { status: 404 });
    }

    return NextResponse.json({ lead: data });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}