import Link from "next/link";

/**
 * Honest empty state.
 *
 * These pages previously rendered invented customers, invoices and revenue from
 * mock-data.ts. A believable fake number is worse than a zero: once one real
 * customer exists you cannot tell which figures on screen are true.
 */
export function EmptyPanel({
  title,
  body,
  hint,
  action,
}: {
  title: string;
  body: string;
  hint?: string;
  action?: { href: string; label: string };
}) {
  return (
    <div className="rounded-xl border border-dashed bg-card px-6 py-14 text-center">
      <h3 className="text-base font-semibold">{title}</h3>
      <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">{body}</p>
      {hint && (
        <p className="mx-auto mt-3 max-w-md text-xs leading-relaxed text-muted-foreground/80">
          {hint}
        </p>
      )}
      {action && (
        <Link
          href={action.href}
          className="mt-6 inline-flex h-9 items-center rounded-lg bg-foreground px-4 text-sm font-medium text-background transition hover:opacity-90"
        >
          {action.label}
        </Link>
      )}
    </div>
  );
}
