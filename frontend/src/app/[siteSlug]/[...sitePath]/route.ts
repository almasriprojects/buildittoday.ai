import { NextRequest } from "next/server";
import {
  isAssetPath,
  notFoundPage,
  renderPublicSite,
  serveEngineAsset,
} from "@/lib/public-site";

/** Serves generated SPA assets and client-side deep links below /{slug}/. */
export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ siteSlug: string; sitePath: string[] }> },
) {
  const { siteSlug, sitePath } = await params;
  const slug = decodeURIComponent(siteSlug);
  const path = sitePath.map(decodeURIComponent).join("/");
  const asset = await serveEngineAsset(slug, path);
  if (asset) return asset;

  // Never return HTML for a missing script, image, font, or video. That masks
  // a bad deployment as a blank SPA and makes the underlying error invisible.
  if (isAssetPath(path)) return notFoundPage();
  return renderPublicSite(request, slug, { track: false });
}
