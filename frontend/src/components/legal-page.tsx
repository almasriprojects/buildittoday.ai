import type { ReactNode } from "react";

/**
 * Shared frame for the legal pages.
 *
 * Deliberately plain and readable: these are the pages a customer opens when
 * they are already uneasy, and dense small print reads as something to hide
 * behind.
 */
export function LegalPage({
  title,
  updated,
  children,
}: {
  title: string;
  updated: string;
  children: ReactNode;
}) {
  return (
    <div className="bg-white">
      <div className="mx-auto max-w-3xl px-6 py-16 md:py-24">
        <h1 className="text-4xl font-semibold tracking-tight text-neutral-900 md:text-5xl">
          {title}
        </h1>
        <p className="mt-3 text-sm text-neutral-500">Last updated {updated}</p>
        <div className="legal mt-10 text-[15.5px] leading-relaxed text-neutral-700">
          {children}
        </div>
      </div>
    </div>
  );
}

export function LegalSection({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="mt-10 border-t border-neutral-200 pt-8 first:border-0 first:pt-0">
      <h2 className="text-lg font-semibold text-neutral-900">{title}</h2>
      <div className="mt-3 space-y-4">{children}</div>
    </section>
  );
}
