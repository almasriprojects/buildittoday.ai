"use client";

export default function Error({ reset }: { error: Error; reset: () => void }) {
  return (
    <main className="flex min-h-[70vh] items-center bg-white">
      <div className="mx-auto max-w-lg px-6 py-20 text-center">
        <p className="text-sm font-medium uppercase tracking-widest text-neutral-500">
          Something went wrong
        </p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-neutral-900">
          That didn&rsquo;t load
        </h1>
        {/* Deliberately no stack trace or error message: it tells a visitor
            nothing useful and can leak internals. */}
        <p className="mt-4 leading-relaxed text-neutral-600">
          Try again in a moment. If it keeps happening, call (305) 505-0153 and we&rsquo;ll
          sort it out.
        </p>
        <button
          onClick={reset}
          className="mt-8 inline-flex h-11 items-center rounded-lg bg-neutral-900 px-6 text-sm font-medium text-white transition hover:bg-neutral-700"
        >
          Try again
        </button>
      </div>
    </main>
  );
}
