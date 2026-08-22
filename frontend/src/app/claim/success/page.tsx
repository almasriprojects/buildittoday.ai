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
          Thank you — we&apos;ve got your payment and your site is reserved. Here&apos;s what happens
          next.
        </p>

        <ol className="mt-10 space-y-5">
          {[
            ["Within one business day", "We email you to confirm your domain and gather any details we need."],
            ["Next few days", "We make the changes you want — copy, photos, colors, layout."],
            ["Within one week", "Your site goes live on your own domain with hosting and SSL configured."],
          ].map(([when, what]) => (
            <li key={when} className="border-l-2 border-neutral-900 pl-5">
              <p className="text-sm font-medium uppercase tracking-wide text-neutral-500">{when}</p>
              <p className="mt-1 text-[15px] leading-relaxed text-neutral-700">{what}</p>
            </li>
          ))}
        </ol>

        <p className="mt-12 text-[15px] leading-relaxed text-neutral-600">
          Questions in the meantime?{" "}
          <a href="/#contact" className="underline underline-offset-4 hover:text-neutral-900">
            Get in touch
          </a>
          .
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
