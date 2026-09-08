import { NextRequest } from "next/server";
import { renderPublicSite } from "@/lib/public-site";

/**
 * GET /{business-name} — the public entry point used in outreach.
 *
 * Static application routes take precedence over this dynamic route. The
 * shared implementation lives outside the route module because Next.js route
 * modules may only export supported handler/config fields.
 */
export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ siteSlug: string }> },
) {
  const { siteSlug } = await params;
  return renderPublicSite(request, decodeURIComponent(siteSlug));
}
