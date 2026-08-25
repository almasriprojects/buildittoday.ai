import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createServerClient, createServiceRoleClient } from "@/lib/supabase";
import { TIERS, money } from "@/lib/pricing";
import { OnboardingForm } from "./onboarding-form";
import { SignOutButton } from "./sign-out";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Your account",
  robots: { index: false, follow: false },
};

const STATE_COPY: Record<string, { label: string; detail: string }> = {
  awaiting_details: {
    label: "We need a few details",
    detail: "Fill in the form below and we'll start building. This is the only thing holding it up.",
  },
  in_build: {
    label: "We're building your site",
    detail: "You'll get an email the moment it's live. Usually within a week of receiving your details.",
  },
  awaiting_domain: {
    label: "Waiting on your domain",
    detail: "Everything's ready — we just need the domain pointed at us. We'll walk you through it.",
  },
  live: { label: "Your site is live", detail: "Need something changed? Ask below." },
  paused: { label: "Paused", detail: "Your site is offline. Call us and we'll sort it out." },
  cancelled: { label: "Cancelled", detail: "Your site is no longer hosted with us. The code is yours." },
};

export default async function AccountPage() {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/account/login");

  // Read through the service role and filter by the bound auth user, rather
  // than relying on the session's row-level access. The binding happens in the
  // auth callback; if it somehow has not, this returns nothing rather than
  // someone else's account.
  const admin = createServiceRoleClient();
  const { data: customer } = await admin
    .from("customers")
    .select("*")
    .eq("auth_user_id", user.id)
    .maybeSingle();

  if (!customer) redirect("/account/login?error=noaccount");

  const tier = TIERS.find((t) => t.key === customer.tier);
  const state = STATE_COPY[customer.onboarding_state] ?? STATE_COPY.awaiting_details;
  const siteUrl = customer.demo_url ?? null;

  const nextBill = customer.current_period_end
    ? new Date(customer.current_period_end).toLocaleDateString("en-US", {
        month: "long", day: "numeric", year: "numeric",
      })
    : null;

  return (
    <main className="min-h-screen bg-neutral-50 text-neutral-900">
      <div className="mx-auto max-w-3xl px-6 py-12 sm:py-16">
        <header className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm text-neutral-500">Your account</p>
            <h1 className="mt-1 text-3xl font-semibold tracking-tight">
              {customer.business_name}
            </h1>
          </div>
          <SignOutButton />
        </header>

        {/* Where things stand — the first question anyone opens this to answer. */}
        <section className="mt-8 rounded-xl border border-neutral-200 bg-white p-6">
          <h2 className="text-lg font-semibold">{state.label}</h2>
          <p className="mt-1.5 leading-relaxed text-neutral-600">{state.detail}</p>

          {siteUrl && (
            <a
              href={siteUrl}
              className="mt-5 inline-flex h-11 items-center rounded-lg bg-neutral-900 px-5 text-sm font-medium text-white transition hover:bg-neutral-700"
            >
              View your site
            </a>
          )}
        </section>

        {customer.onboarding_state === "awaiting_details" && (
          <section className="mt-6 rounded-xl border border-neutral-200 bg-white p-6">
            <h2 className="text-lg font-semibold">Tell us where it should live</h2>
            <p className="mt-1.5 text-sm leading-relaxed text-neutral-600">
              We need a domain and a few real details. If you don&rsquo;t have a domain yet, say so
              below and we&rsquo;ll help you pick one.
            </p>
            <OnboardingForm
              defaults={{
                domain: customer.domain ?? "",
                phone: customer.phone ?? "",
                addressStreet: customer.address_street ?? "",
                addressCity: customer.address_city ?? "",
                addressZip: customer.address_zip ?? "",
              }}
            />
          </section>
        )}

        {/* What they pay. */}
        <section className="mt-6 rounded-xl border border-neutral-200 bg-white p-6">
          <h2 className="text-lg font-semibold">Your plan</h2>
          <dl className="mt-4 grid gap-4 sm:grid-cols-2">
            <div>
              <dt className="text-xs uppercase tracking-wide text-neutral-500">Package</dt>
              <dd className="mt-1 font-medium">{tier?.name ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide text-neutral-500">Monthly</dt>
              <dd className="mt-1 font-medium">
                {customer.monthly_cents ? `${money(customer.monthly_cents / 100)}/month` : "—"}
              </dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide text-neutral-500">Status</dt>
              <dd className="mt-1 font-medium capitalize">
                {(customer.subscription_status ?? "—").replace(/_/g, " ")}
                {customer.cancel_at_period_end && " · ends at period end"}
              </dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide text-neutral-500">Next payment</dt>
              <dd className="mt-1 font-medium">{nextBill ?? "—"}</dd>
            </div>
          </dl>
          <p className="mt-5 border-t pt-4 text-sm text-neutral-600">
            To change your card or cancel, call{" "}
            <a href="tel:+13055050153" className="font-medium text-neutral-900 hover:underline">
              (305) 505-0153
            </a>{" "}
            or email us. No contract — cancel any time and the site stays yours.
          </p>
        </section>

        {/* How to reach a person. */}
        <section className="mt-6 rounded-xl border border-neutral-200 bg-white p-6">
          <h2 className="text-lg font-semibold">Need something changed?</h2>
          <p className="mt-1.5 text-sm leading-relaxed text-neutral-600">
            Content edits are included in your plan. Tell us what you want and we&rsquo;ll do it.
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            <a
              href={`mailto:contact@buildittoday.ai?subject=${encodeURIComponent(`Change request — ${customer.business_name}`)}`}
              className="inline-flex h-11 items-center rounded-lg border border-neutral-300 px-5 text-sm font-medium transition hover:bg-neutral-50"
            >
              Email us
            </a>
            <a
              href="tel:+13055050153"
              className="inline-flex h-11 items-center rounded-lg border border-neutral-300 px-5 text-sm font-medium transition hover:bg-neutral-50"
            >
              (305) 505-0153
            </a>
          </div>
        </section>
      </div>
    </main>
  );
}
