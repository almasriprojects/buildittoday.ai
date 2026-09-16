import Link from "next/link";
import { notFound } from "next/navigation";
import { BookingCalendar } from "@/components/main/booking-calendar";
import { createServiceRoleClient } from "@/lib/supabase";

export const dynamic = "force-dynamic";

/**
 * /book/[slug] — the page a business owner lands on when they answer.
 *
 * Every outreach email says "if it's easier to talk than to type, pick a time
 * and I'll call you". That link used to point at the marketing homepage:
 * eighteen thousand pixels of agency pitch, with the calendar at 12,930px,
 * past ten sections about 3D animation and three pricing tables. The ?demo=
 * parameter identifying the business was read by nothing on the page.
 *
 * So the promise of the email — I built this for YOU specifically — died on
 * the click, and the calendar had taken zero bookings in the weeks it had
 * existed.
 *
 * This page is the whole of the answer: their business name, their site, and
 * a calendar, with the name and email we wrote to already filled in. Nothing
 * to scroll past and nothing to retype.
 */

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  const supabase = createServiceRoleClient();
  const { data: site } = await supabase
    .from("demo_sites")
    .select("business_name")
    .eq("public_slug", slug)
    .maybeSingle();
  const who = site?.business_name ?? "your business";
  return {
    title: `Book a call about ${who}`,
    description: `Pick a time to talk about the website built for ${who}.`,
    // A booking link is sent to one person. It has no business being indexed.
    robots: { index: false, follow: false },
  };
}

export default async function BookPage({ params }: Props) {
  const { slug } = await params;
  const supabase = createServiceRoleClient();

  const { data: site } = await supabase
    .from("demo_sites")
    .select("demo_slug, public_slug, business_name, city")
    .eq("public_slug", slug)
    .maybeSingle();

  // An unknown slug means a mistyped or expired link. Better a clear page than
  // a 404 for someone who was trying to say yes.
  if (!site) notFound();

  // What we already know about them, so the form is a formality.
  const { data: lead } = await supabase
    .from("leads")
    .select("contact_full_name, contact_email, state_email, contact_phone, contact_confidence, business_name, city")
    .eq("demo_slug", site.demo_slug)
    .maybeSingle();

  const businessName = site.business_name ?? lead?.business_name ?? "your business";
  const city = site.city ?? lead?.city ?? null;

  // Only pre-fill a person's name when it is actually theirs. The contact
  // record comes from an address lookup that names somebody else 71% of the
  // time — putting a stranger's name in the box is worse than leaving it empty.
  const trustedName =
    lead?.contact_confidence === "owner" ? (lead.contact_full_name ?? null) : null;
  const prefillEmail = lead?.state_email ?? lead?.contact_email ?? null;

  return (
    <main className="min-h-screen bg-[#FBFAF8] text-[#16181C]">
      <div className="mx-auto w-full max-w-3xl px-5 py-12 sm:py-16">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#8A8D93]">
          BuildItToday.ai
        </p>

        <h1 className="mt-3 text-3xl font-semibold leading-tight tracking-tight sm:text-4xl">
          Let&rsquo;s talk about {businessName}
        </h1>

        <p className="mt-4 max-w-[60ch] text-[15px] leading-relaxed text-[#5C6067]">
          Thirty minutes, no charge, no obligation. I&rsquo;ll walk you through the site
          I built{city ? ` for your ${city} business` : ""}, change anything you don&rsquo;t
          like, and answer whatever you want to ask. If it isn&rsquo;t for you, that&rsquo;s a
          perfectly good outcome and I won&rsquo;t chase you.
        </p>

        <Link
          href={`/${site.public_slug}`}
          className="mt-6 inline-flex items-center gap-2 rounded-full border border-[#DEDBD4] bg-white px-4 py-2 text-sm font-medium text-[#16181C] transition-colors hover:border-[#B9B5AC]"
        >
          Look at the site again
          <span aria-hidden="true">→</span>
        </Link>

        <div className="mt-10 rounded-2xl border border-[#E4E1DA] bg-white p-5 shadow-[0_1px_2px_rgba(20,22,26,.05),0_10px_30px_rgba(20,22,26,.04)] sm:p-7">
          <BookingCalendar
            prefill={{
              name: trustedName,
              email: prefillEmail,
              phone: null,
              businessName,
              demoSlug: site.demo_slug,
            }}
          />
        </div>

        <p className="mt-8 text-[13px] leading-relaxed text-[#8A8D93]">
          Prefer email? Reply to the message I sent you and it comes straight to me.
        </p>
      </div>
    </main>
  );
}
