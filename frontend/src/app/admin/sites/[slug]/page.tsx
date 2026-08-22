import { notFound } from "next/navigation";
import { createServiceRoleClient } from "@/lib/supabase";
import { SitePreview } from "@/components/admin/site-preview";
import type { GeneratedContent } from "@/components/admin/site-copy";
import type { ReviewStatus } from "@/components/admin/site-review";

export const dynamic = "force-dynamic";

export default async function SitePreviewPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ nav?: string; i?: string }>;
}) {
  const { slug } = await params;
  const { nav, i } = await searchParams;

  // The list passes its filtered order so "next" means next in what you were
  // looking at, not next in the whole table.
  const navSlugs = nav ? decodeURIComponent(nav).split(",").filter(Boolean) : [];
  const navIndex = Number(i);
  const navCtx =
    navSlugs.length > 0 && Number.isInteger(navIndex) && navSlugs[navIndex] === slug
      ? { slugs: navSlugs, index: navIndex, navParam: nav! }
      : null;
  const supabase = createServiceRoleClient();

  const [{ data: site }, { data: lead }, { data: media }] = await Promise.all([
    supabase
      .from("demo_sites")
      .select("demo_slug, status, generator_version, generated_at, storage_path, review_status, review_note, reviewed_at, reviewed_by")
      .eq("demo_slug", slug)
      .maybeSingle(),
    supabase
      .from("leads")
      .select(
        "id, business_name, business_category, city, state, contact_email, contact_phone, owner_full_name, owner_mailing_address, owner_mailing_city, owner_mailing_zip, outreach_sent_at, postcard_sent, demo_viewed_at, generated_content"
      )
      .eq("demo_slug", slug)
      .maybeSingle(),
    supabase
      .from("demo_media")
      .select("clip_count, hero_video_url, hero_poster_url, brief_json, scenes_json")
      .eq("demo_slug", slug)
      .maybeSingle(),
  ]);

  if (!site || site.status !== "ready" || !lead) notFound();

  const palette = (media?.brief_json as { palette?: Record<string, string> } | null)?.palette ?? null;
  const scenes =
    (media?.scenes_json as { idx: number; scene_name: string; video_ok: boolean }[] | null) ?? [];

  return (
    <SitePreview
      slug={slug}
      navCtx={navCtx}
      content={(lead.generated_content as GeneratedContent | null) ?? null}
      review={{
        status: (site.review_status ?? "pending") as ReviewStatus,
        note: site.review_note ?? null,
        reviewedAt: site.reviewed_at ?? null,
        reviewedBy: site.reviewed_by ?? null,
      }}
      lead={{
        business_name: lead.business_name,
        business_category: lead.business_category,
        city: lead.city,
        state: lead.state,
        contact_email: lead.contact_email,
        contact_phone: lead.contact_phone,
        owner_full_name: lead.owner_full_name,
        mailing: [lead.owner_mailing_address, lead.owner_mailing_city, lead.owner_mailing_zip]
          .filter(Boolean)
          .join(", "),
        outreach_sent_at: lead.outreach_sent_at,
        postcard_sent: Boolean(lead.postcard_sent),
        demo_viewed_at: lead.demo_viewed_at,
      }}
      build={{
        generator_version: site.generator_version,
        generated_at: site.generated_at,
        clip_count: media?.clip_count ?? null,
        has_video: Boolean(media?.hero_video_url),
        palette,
        scenes,
      }}
    />
  );
}
