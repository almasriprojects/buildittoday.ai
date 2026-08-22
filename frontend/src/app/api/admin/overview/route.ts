import { NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase";

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/overview — real counts for the admin pages that previously
 * read from mock-data.ts and displayed invented revenue.
 *
 * Everything here is a live count. When a number is zero it is genuinely zero,
 * which is the point: the day a real customer exists you need to be able to
 * trust what is on screen.
 */
export async function GET() {
  const supabase = createServiceRoleClient();

  // Count rows in a table, optionally filtered by one column = value.
  // Every admin figure is a live count — no constants, no mock data.
  const count = async (table: string, col?: string, val?: string) => {
    const base = supabase.from(table).select("*", { count: "exact", head: true });
    const { count: n } = col ? await base.eq(col, val!) : await base;
    return n ?? 0;
  };

  const [
    customersTotal,
    customersActive,
    customersPending,
    potentialTotal,
    potentialPaid,
    leadsTotal,
    leadsQualified,
    demosReady,
    demosApproved,
    outreachSent,
    outreachOpened,
    outreachClicked,
    outreachScanned,
    outreachViewed,
    outreachPaid,
  ] = await Promise.all([
    count("customers"),
    count("customers", "subscription_status", "active"),
    count("customers", "subscription_status", "pending"),
    count("potential_customers"),
    count("potential_customers", "status", "paid"),
    count("leads"),
    count("leads", "target_fit", "yes"),
    count("demo_sites", "status", "ready"),
    count("demo_sites", "review_status", "approved"),
    count("outreach_events", "event_type", "sent"),
    count("outreach_events", "event_type", "opened"),
    count("outreach_events", "event_type", "clicked"),
    count("outreach_events", "event_type", "scanned"),
    count("outreach_events", "event_type", "viewed"),
    count("outreach_events", "event_type", "paid"),
  ]);

  const { data: recentCustomers } = await supabase
    .from("customers")
    .select("id, business_name, email, subscription_status, hosting_status, created_at")
    .order("created_at", { ascending: false })
    .limit(10);

  const { data: recentPotential } = await supabase
    .from("potential_customers")
    .select("id, demo_slug, email, full_name, source, status, created_at")
    .order("created_at", { ascending: false })
    .limit(10);

  // Revenue is derived from customers who actually paid — never a constant.
  const SETUP_FEE = 1500;
  const MONTHLY = 50;

  return NextResponse.json({
    customers: {
      total: customersTotal,
      active: customersActive,
      pending: customersPending,
      recent: recentCustomers ?? [],
    },
    potential: {
      total: potentialTotal,
      paid: potentialPaid,
      recent: recentPotential ?? [],
    },
    pipeline: {
      leads: leadsTotal,
      qualified: leadsQualified,
      demosReady,
      demosApproved,
    },
    funnel: {
      sent: outreachSent,
      opened: outreachOpened,
      clicked: outreachClicked,
      scanned: outreachScanned,
      viewed: outreachViewed,
      paid: outreachPaid,
    },
    revenue: {
      setupCollected: customersTotal * SETUP_FEE,
      monthlyRecurring: customersActive * MONTHLY,
      setupFee: SETUP_FEE,
      monthlyFee: MONTHLY,
    },
  });
}
