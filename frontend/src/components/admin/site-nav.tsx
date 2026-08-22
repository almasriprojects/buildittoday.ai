"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";

export type NavContext = {
  slugs: string[];
  index: number;
  navParam: string;
};

/** Build the href for a neighbour, carrying the same list context forward. */
export function neighbourHref(ctx: NavContext, offset: number): string | null {
  const i = ctx.index + offset;
  if (i < 0 || i >= ctx.slugs.length) return null;
  return `/admin/sites/${ctx.slugs[i]}?nav=${ctx.navParam}&i=${i}`;
}

export function SiteNav({ ctx }: { ctx: NavContext | null }) {
  const router = useRouter();
  const prev = ctx ? neighbourHref(ctx, -1) : null;
  const next = ctx ? neighbourHref(ctx, 1) : null;

  // J / K move through the queue — but never while typing, or K would land
  // in the code editor instead of moving to the next site.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const el = document.activeElement as HTMLElement | null;
      const typing =
        el &&
        (el.tagName === "INPUT" ||
          el.tagName === "TEXTAREA" ||
          el.tagName === "SELECT" ||
          el.isContentEditable);
      if (typing || e.metaKey || e.ctrlKey || e.altKey) return;

      if (e.key === "j" && next) {
        e.preventDefault();
        router.push(next);
      }
      if (e.key === "k" && prev) {
        e.preventDefault();
        router.push(prev);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [next, prev, router]);

  if (!ctx) return null;

  return (
    <div className="flex items-center gap-1.5">
      <a
        href={prev ?? undefined}
        aria-disabled={!prev}
        title="Previous (K)"
        className={`inline-flex h-9 items-center gap-1 rounded-lg border px-2.5 text-xs font-medium transition ${
          prev
            ? "text-muted-foreground hover:text-foreground"
            : "pointer-events-none opacity-35"
        }`}
      >
        <ChevronLeft className="h-3.5 w-3.5" /> Prev
      </a>
      <span className="px-1 font-mono text-[11px] tabular-nums text-muted-foreground">
        {ctx.index + 1} / {ctx.slugs.length}
      </span>
      <a
        href={next ?? undefined}
        aria-disabled={!next}
        title="Next (J)"
        className={`inline-flex h-9 items-center gap-1 rounded-lg border px-2.5 text-xs font-medium transition ${
          next
            ? "text-muted-foreground hover:text-foreground"
            : "pointer-events-none opacity-35"
        }`}
      >
        Next <ChevronRight className="h-3.5 w-3.5" />
      </a>
    </div>
  );
}
