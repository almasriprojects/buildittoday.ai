import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export type GeneratedSite = {
  demo_slug: string;
  business_name: string;
  business_category: string | null;
  city: string | null;
  state: string | null;
  generator_version: string | null;
  generated_at: string | null;
  clip_count: number | null;
  has_video: boolean;
  text_flags: number;
  review_status: string;
  has_email: boolean;
  has_address: boolean;
  outreach_sent_at: string | null;
  postcard_sent: boolean;
  demo_viewed_at: string | null;
};

// GET /api/demo-sites — every lead that already has a generated demo page.
export async function GET(request: NextRequest) {
  const supabase = createServiceRoleClient();
  const { searchParams } = new URL(request.url);
  const limit = Math.min(Number(searchParams.get("limit") ?? 500), 2000);

  const { data: sites, error } = await supabase
    .from("demo_sites")
    .select("demo_slug, generator_version, generated_at, review_status")
    .eq("status", "ready")
    .order("generated_at", { ascending: false })
    .limit(limit);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (!sites?.length) {
    return NextResponse.json({ sites: [], counts: emptyCounts() });
  }

  const slugs = sites.map((s) => s.demo_slug);

  const [{ data: leads }, { data: media }] = await Promise.all([
    supabase
      .from("leads")
      .select(
        "demo_slug, business_name, business_category, city, state, contact_email, owner_mailing_address, outreach_sent_at, postcard_sent, demo_viewed_at"
      )
      .in("demo_slug", slugs),
    supabase
      .from("demo_media")
      .select("demo_slug, clip_count, hero_video_url, scenes_json")
      .in("demo_slug", slugs),
  ]);

  const leadBySlug = new Map((leads ?? []).map((l) => [l.demo_slug, l]));
  const mediaBySlug = new Map((media ?? []).map((m) => [m.demo_slug, m]));

  const rows: GeneratedSite[] = sites
    .filter((s) => leadBySlug.has(s.demo_slug))
    .map((s) => {
      const l = leadBySlug.get(s.demo_slug)!;
      const m = mediaBySlug.get(s.demo_slug);
      return {
        demo_slug: s.demo_slug,
        business_name: l.business_name,
        business_category: l.business_category,
        city: l.city,
        state: l.state,
        generator_version: s.generator_version,
        generated_at: s.generated_at,
        clip_count: m?.clip_count ?? null,
        has_video: Boolean(m?.hero_video_url),
        // Only severity "bad" counts — the raw gate flags incidental lettering
        // (a distant sign, tiny screen UI) that no visitor would notice.
        text_flags: (
          (m?.scenes_json as { text_severity?: string | null }[] | null) ?? []
        ).filter((sc) => sc.text_severity === "bad").length,
        review_status: s.review_status ?? "pending",
        has_email: Boolean(l.contact_email),
        has_address: Boolean(l.owner_mailing_address),
        outreach_sent_at: l.outreach_sent_at,
        postcard_sent: Boolean(l.postcard_sent),
        demo_viewed_at: l.demo_viewed_at,
      };
    });

  const counts = {
    total: rows.length,
    withVideo: rows.filter((r) => r.has_video).length,
    fullQuality: rows.filter((r) => r.clip_count === 3).length,
    noVideo: rows.filter((r) => !r.has_video).length,
    sent: rows.filter((r) => r.outreach_sent_at || r.postcard_sent).length,
    unsent: rows.filter((r) => !r.outreach_sent_at && !r.postcard_sent).length,
    viewed: rows.filter((r) => r.demo_viewed_at).length,
    reachable: rows.filter((r) => r.has_email || r.has_address).length,
    approved: rows.filter((r) => r.review_status === "approved").length,
    flagged: rows.filter((r) => r.text_flags > 0 || !r.has_video || r.clip_count !== 3).length,
  };

  return NextResponse.json({ sites: rows, counts });
}

function emptyCounts() {
  return {
    total: 0, withVideo: 0, fullQuality: 0, noVideo: 0,
    sent: 0, unsent: 0, viewed: 0, reachable: 0, approved: 0, flagged: 0,
  };
}
