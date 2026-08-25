import Link from "next/link";

export const metadata = {
  title: "Page not found",
  robots: { index: false, follow: false },
};

export default function NotFound() {
  return (
    <main className="flex min-h-[70vh] items-center bg-white">
      <div className="mx-auto max-w-lg px-6 py-20 text-center">
        <p className="text-sm font-medium uppercase tracking-widest text-neutral-500">
          404
        </p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-neutral-900 sm:text-4xl">
          That page doesn&rsquo;t exist
        </h1>
        <p className="mt-4 leading-relaxed text-neutral-600">
          The link may be out of date, or the address slightly off. Nothing is broken on
          your end.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link
            href="/"
            className="inline-flex h-11 items-center rounded-lg bg-neutral-900 px-6 text-sm font-medium text-white transition hover:bg-neutral-700"
          >
            Go to the homepage
          </Link>
          <a
            href="mailto:contact@buildittoday.ai"
            className="inline-flex h-11 items-center rounded-lg border border-neutral-300 px-6 text-sm font-medium transition hover:bg-neutral-50"
          >
            Email us
          </a>
        </div>
      </div>
    </main>
  );
}
