export const dynamic = "force-dynamic";

export const metadata = {
  title: "You're all set — BuildItToday.ai",
};

export default async function ClaimSuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ session_id?: string }>;
}) {
  const { session_id } = await searchParams;

  return (
    <main className="min-h-screen bg-white text-neutral-900">
      <div className="mx-auto max-w-2xl px-6 py-24">
        <p className="text-sm font-medium uppercase tracking-widest text-neutral-500">
          Payment received
        </p>
        <h1 className="mt-4 text-4xl font-semibold leading-tight tracking-tight">
          Your website is claimed.
        </h1>
        <p className="mt-5 text-lg leading-relaxed text-neutral-600">
          Thank you — we&apos;ve got your payment and your site is reserved. There&apos;s one thing
          we need from you, and it takes about two minutes.
        </p>

        {/*
          This page used to say "we email you within one business day", which
          told the customer to sit and wait at the exact moment they were most
          willing to act — and contradicted the welcome email, sent seconds
          later by the Stripe webhook, which says the only thing holding the
          build up is their domain. It also never linked to /account at all, so
          a customer whose welcome email went to spam had no way forward from
          the last page they will reliably see.
        */}
        <div className="mt-10 rounded-lg border border-neutral-900 p-6">
          <p className="text-sm font-medium uppercase tracking-wide text-neutral-500">
            Step 1 — the only thing we&apos;re waiting on
          </p>
          <p className="mt-2 text-[15px] leading-relaxed text-neutral-700">
            Tell us your domain and anything you want changed — copy, photos, colors, layout.
            Sign in with the email address you just paid with; there&apos;s no password.
          </p>
          <a
            href="/account"
            className="mt-5 inline-block rounded-md bg-neutral-900 px-5 py-3 text-[15px] font-medium text-white hover:bg-neutral-700"
          >
            Add your details
          </a>
        </div>

        <ol className="mt-10 space-y-5">
          {[
            ["Then, usually within a week", "We make your changes and build the real thing."],
            ["When it's ready", "We point your domain at it, set up hosting and SSL, and email you when it's live."],
          ].map(([when, what]) => (
            <li key={when} className="border-l-2 border-neutral-200 pl-5">
              <p className="text-sm font-medium uppercase tracking-wide text-neutral-500">{when}</p>
              <p className="mt-1 text-[15px] leading-relaxed text-neutral-700">{what}</p>
            </li>
          ))}
        </ol>

        <p className="mt-12 text-[15px] leading-relaxed text-neutral-600">
          A copy of this is in your inbox. If anything is wrong, or you&apos;ve changed your mind,{" "}
          <a href="/#contact" className="underline underline-offset-4 hover:text-neutral-900">
            get in touch
          </a>{" "}
          — there&apos;s no contract and nothing is locked in.
        </p>

        {session_id && (
          <p className="mt-10 border-t border-neutral-200 pt-5 font-mono text-xs text-neutral-400">
            Reference: {session_id}
          </p>
        )}
      </div>
    </main>
  );
}
