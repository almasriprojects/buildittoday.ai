import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase";
import { createCheckoutSession } from "@/lib/checkout";
import { TIERS, byKey, type TierKey } from "@/lib/pricing";

export const dynamic = "force-dynamic";

/**
 * GET /api/checkout/start?slug=…&tier=… — press a package button, land on Stripe.
 *
 * A GET so the package buttons are ordinary links: they work before any
 * JavaScript runs, they survive a middle-click, and there is no form standing
 * between wanting the site and paying for it. The business name comes from the
 * lead and Stripe collects the email with the card, so there is nothing to ask
 * for on the way.
 */
export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const slug = (url.searchParams.get("slug") ?? "").trim();
  const tierKey = url.searchParams.get("tier") ?? "";

  const back = (reason: string) =>
    NextResponse.redirect(
      new URL(
        slug ? `/claim?slug=${encodeURIComponent(slug)}&error=${reason}` : `/claim?error=${reason}`,
        request.url
      ),
      303
    );

  if (!TIERS.some((t) => t.key === tierKey)) return back("tier");
  const tier = byKey(tierKey as TierKey);

  // A tier that sells by conversation should never be able to reach checkout,
  // even if someone edits the URL.
  if (tier.action !== "checkout") {
    return NextResponse.redirect(new URL("/#book", request.url), 303);
  }

  try {
    const supabase = createServiceRoleClient();
    const { data: lead } = await supabase
      .from("leads")
      .select("business_name, contact_email")
      .eq("demo_slug", slug)
      .maybeSingle();

    if (!lead?.business_name) return back("unknown");

    const session = await createCheckoutSession({
      tier,
      businessName: lead.business_name,
      demoSlug: slug,
      // Prefill only if we actually hold one; Stripe asks otherwise.
      email: lead.contact_email ?? null,
    });

    if (!session.url) return back("stripe");

    // 303 so the browser follows with a GET rather than repeating anything.
    return NextResponse.redirect(session.url, 303);
  } catch {
    // Send them somewhere useful rather than showing a stack trace.
    return back("stripe");
  }
}
