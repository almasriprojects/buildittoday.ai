import { createServiceRoleClient } from "@/lib/supabase";
import { ClaimForm } from "@/components/claim/claim-form";
import { HEADLINE, TIERS, byKey, money, type TierKey } from "@/lib/pricing";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Claim Your Website — BuildItToday.ai",
  description:
    `Your website is already built. Claim it and we launch it on your own domain within a week.`,
};

export default async function ClaimPage({
  searchParams,
}: {
  searchParams: Promise<{ slug?: string; checkout?: string; tier?: string }>;
}) {
  const { slug, checkout, tier } = await searchParams;

  // Which package they picked on their own site. Professional is the default
  // for anyone arriving without a choice — it is the one the emails quote.
  const isTier = (t?: string): t is TierKey =>
    Boolean(t) && TIERS.some((x) => x.key === t);
  const chosen = isTier(tier) ? byKey(tier) : HEADLINE;

  let businessName: string | null = null;
  let city: string | null = null;
  let hasDemo = false;
  let publicSlug: string | null = null;

  if (slug) {
    const supabase = createServiceRoleClient();
    const { data: lead } = await supabase
      .from("leads")
      .select("business_name, city, state")
      .eq("demo_slug", slug)
      .maybeSingle();
    if (lead) {
      businessName = lead.business_name;
      city = [lead.city, lead.state].filter(Boolean).join(", ");
    }
    const { data: site } = await supabase
      .from("demo_sites")
      .select("id, public_slug")
      .eq("demo_slug", slug)
      .eq("status", "ready")
      .maybeSingle();
    hasDemo = Boolean(site);
    publicSlug = site?.public_slug ?? null;
  }

  return (
    <main className="min-h-screen bg-white text-neutral-900">
      <div className="mx-auto max-w-3xl px-6 py-16 sm:py-24">
        {checkout === "cancelled" && (
          <div className="mb-10 rounded-lg border border-amber-300 bg-amber-50 px-5 py-4 text-sm text-amber-900">
            Checkout was cancelled — nothing was charged. Your site is still reserved below.
          </div>
        )}

        <header>
          <p className="text-sm font-medium uppercase tracking-widest text-neutral-500">
            {businessName ? "Reserved for you" : "Claim your website"}
          </p>
          <h1 className="mt-4 text-4xl font-semibold leading-tight tracking-tight sm:text-5xl">
            {businessName ? (
              <>
                We built a website for{" "}
                <span className="text-neutral-500">{businessName}</span>.
              </>
            ) : (
              <>Your website is already built.</>
            )}
          </h1>
          <p className="mt-5 max-w-xl text-lg leading-relaxed text-neutral-600">
            {businessName
              ? `It's finished and online right now. Claim it and we'll launch it on your own domain${
                  city ? `, serving ${city}` : ""
                }, within a week.`
              : "Claim it and we'll launch it on your own domain within a week."}
          </p>
        </header>

        {hasDemo && slug && (
          <a
            href={publicSlug ? `/${publicSlug}` : `/demo-sites/${slug}`}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-8 inline-flex items-center gap-2 text-base font-medium text-neutral-900 underline underline-offset-4 hover:text-neutral-600"
          >
            See your website again →
          </a>
        )}

        {/* Price */}
        <section className="mt-14 rounded-2xl border border-neutral-200 bg-neutral-50 p-8">
          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <span className="text-5xl font-semibold tracking-tight">{money(chosen.setup)}</span>
            <span className="text-lg text-neutral-600">one time</span>
          </div>
          <p className="mt-2 text-base text-neutral-600">
            Then <strong className="font-semibold text-neutral-900">{money(chosen.monthly)}/month</strong> for hosting,
            updates, and support. Cancel any time.
          </p>

          <ul className="mt-8 space-y-3">
            {chosen.features.map((item) => (
              <li key={item} className="flex gap-3 text-[15px] leading-relaxed text-neutral-700">
                <span aria-hidden="true" className="mt-[7px] h-1.5 w-1.5 flex-none rounded-full bg-neutral-900" />
                {item}
              </li>
            ))}
          </ul>

          <div className="mt-10">
            <ClaimForm businessName={businessName} demoSlug={slug ?? null} tier={chosen.key} />
          </div>
        </section>

        <section className="mt-14 space-y-8">
          <div>
            <h2 className="text-lg font-semibold">What happens after you pay</h2>
            <ol className="mt-3 space-y-2 text-[15px] leading-relaxed text-neutral-600">
              <li>1. We email you within one business day to confirm your domain and details.</li>
              <li>2. We make any changes you want to the copy, photos, and layout.</li>
              <li>3. Your site goes live on your domain — within one week of payment.</li>
            </ol>
          </div>

          <div>
            <h2 className="text-lg font-semibold">Common questions</h2>
            <dl className="mt-3 space-y-5 text-[15px] leading-relaxed">
              <div>
                <dt className="font-medium text-neutral-900">Do I own the site?</dt>
                <dd className="mt-1 text-neutral-600">
                  Yes. The design and code are yours to keep, on your own domain.
                </dd>
              </div>
              <div>
                <dt className="font-medium text-neutral-900">What is the {money(chosen.monthly)}/month for?</dt>
                <dd className="mt-1 text-neutral-600">
                  Hosting, SSL, security updates, backups, and small content changes when you need
                  them. Cancel any time — you keep the site.
                </dd>
              </div>
              <div>
                <dt className="font-medium text-neutral-900">Can I change the design?</dt>
                <dd className="mt-1 text-neutral-600">
                  Yes. What you saw is a starting point. We adjust copy, photos, colors, and layout
                  before launch.
                </dd>
              </div>
              <div>
                <dt className="font-medium text-neutral-900">I&apos;d rather talk to someone first.</dt>
                <dd className="mt-1 text-neutral-600">
                  That&apos;s fine —{" "}
                  <a href="/#contact" className="underline underline-offset-4 hover:text-neutral-900">
                    get in touch
                  </a>{" "}
                  and we&apos;ll answer your questions before you decide.
                </dd>
              </div>
            </dl>
          </div>
        </section>
      </div>
    </main>
  );
}
