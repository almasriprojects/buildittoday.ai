import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase";
import { requireAdmin } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/inventory — every business we hold, counted.
 *
 * The grouping happens in Postgres. There are 47,000 leads and that number
 * only grows, so the browser asks for buckets and gets buckets rather than
 * downloading the table and counting it itself.
 */

// Matched against a fixed list before it reaches the database, so an
// unexpected value falls back to the default instead of being passed through.
const DIMENSIONS = ["category", "county", "entity", "fit", "tier", "city"] as const;
type Dimension = (typeof DIMENSIONS)[number];

const clean = (v: string | null) => (v && v.trim() !== "" ? v.trim() : null);

export async function GET(request: NextRequest) {
  const gate = await requireAdmin();
  if (!gate.ok) return gate.response;

  const q = new URL(request.url).searchParams;
  const raw = q.get("dimension") ?? "category";
  const dimension: Dimension = (DIMENSIONS as readonly string[]).includes(raw)
    ? (raw as Dimension)
    : "category";

  const supabase = createServiceRoleClient();

  const [{ data: rows, error }, { data: options }] = await Promise.all([
    supabase.rpc("lead_breakdown", {
      dimension,
      filter_fit: clean(q.get("fit")),
      filter_tier: clean(q.get("tier")),
      filter_category: clean(q.get("category")),
    }),
    supabase.rpc("lead_filter_options"),
  ]);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  type Row = {
    label: string; email: number; phone: number;
    post: number; unreachable: number; total: number;
  };

  const bars = ((rows ?? []) as Row[]).map((r) => ({
    label: r.label,
    email: Number(r.email),
    phone: Number(r.phone),
    post: Number(r.post),
    unreachable: Number(r.unreachable),
    total: Number(r.total),
  }));

  const sum = (k: keyof Omit<Row, "label">) => bars.reduce((n, b) => n + b[k], 0);

  type Opt = { kind: string; value: string; n: number };
  const byKind = (kind: string) =>
    ((options ?? []) as Opt[])
      .filter((o) => o.kind === kind)
      .map((o) => ({ value: o.value, n: Number(o.n) }));

  return NextResponse.json({
    dimension,
    bars,
    totals: {
      all: sum("total"),
      email: sum("email"),
      phone: sum("phone"),
      post: sum("post"),
      unreachable: sum("unreachable"),
    },
    options: {
      fit: byKind("fit"),
      tier: byKind("tier"),
      category: byKind("category"),
    },
  });
}
