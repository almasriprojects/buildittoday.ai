import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase";

// GET /demo-sites/[slug] — serves the AI-generated bespoke HTML for a demo
// site (produced by generate-design-html, stored in the demo-sites bucket).
// Route Handlers bypass the root layout's <html>/<body>, so this can return
// a full standalone document as-is. /demo/[businessId] redirects here when
// a ready row exists in demo_sites.
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const supabase = createServiceRoleClient();

  const { data: site } = await supabase
    .from("demo_sites")
    .select("storage_path")
    .eq("demo_slug", slug)
    .eq("status", "ready")
    .maybeSingle();

  if (!site || !site.storage_path) {
    return new NextResponse("Not found", { status: 404 });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  const fileRes = await fetch(
    `${supabaseUrl}/storage/v1/object/demo-sites/${site.storage_path}`,
    {
      headers: { Authorization: `Bearer ${serviceKey}`, apikey: serviceKey },
      cache: "no-store",
    }
  );

  if (!fileRes.ok) {
    return new NextResponse("Not found", { status: 404 });
  }

  const html = await fileRes.text();
  return new NextResponse(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}
