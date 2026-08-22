"use client";

export type GeneratedContent = {
  tagline?: string;
  hero?: { headline?: string; subheadline?: string; cta_text?: string };
  about?: { heading?: string; body?: string };
  services?: { title?: string; description?: string }[];
  why_choose_us?: string[];
  contact_cta?: { heading?: string; body?: string; button_text?: string };
};

// The AI has written a claim about a real business here. It has been wrong
// before (a consulting firm described as a video/photography company), and a
// wrong claim is invisible while it's buried in a rendered page — so show the
// copy as plain text where it can be read in one pass.
export function SiteCopy({
  content,
  businessName,
  category,
}: {
  content: GeneratedContent | null;
  businessName: string;
  category: string | null;
}) {
  if (!content) {
    return (
      <div className="rounded-xl border bg-card p-4">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Written copy
        </h2>
        <p className="mt-2 text-xs text-muted-foreground">
          No generated content stored for this lead.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border bg-card">
      <div className="border-b px-4 py-3">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Written copy
        </h2>
        <p className="mt-1 text-[11px] text-muted-foreground">
          Check this describes <strong className="text-foreground">{businessName}</strong>
          {category ? ` — a ${category.toLowerCase()} business` : ""}. Wrong industry or invented
          detail means don&apos;t send.
        </p>
      </div>

      <div className="divide-y">
        {content.tagline && <Block label="Tagline">{content.tagline}</Block>}

        {content.hero?.headline && (
          <Block label="Hero">
            <p className="font-medium">{content.hero.headline}</p>
            {content.hero.subheadline && (
              <p className="mt-1 text-muted-foreground">{content.hero.subheadline}</p>
            )}
            {content.hero.cta_text && (
              <p className="mt-1.5 text-[11px] text-muted-foreground">
                Button: “{content.hero.cta_text}”
              </p>
            )}
          </Block>
        )}

        {content.about?.body && (
          <Block label={content.about.heading || "About"}>{content.about.body}</Block>
        )}

        {content.services?.length ? (
          <Block label={`Services (${content.services.length})`}>
            <ul className="space-y-2">
              {content.services.map((s, i) => (
                <li key={i}>
                  <span className="font-medium">{s.title}</span>
                  {s.description && (
                    <span className="text-muted-foreground"> — {s.description}</span>
                  )}
                </li>
              ))}
            </ul>
          </Block>
        ) : null}

        {content.why_choose_us?.length ? (
          <Block label="Why choose us">
            <ul className="list-disc space-y-1 pl-4">
              {content.why_choose_us.map((w, i) => (
                <li key={i}>{w}</li>
              ))}
            </ul>
          </Block>
        ) : null}

        {content.contact_cta?.heading && (
          <Block label="Contact CTA">
            <p className="font-medium">{content.contact_cta.heading}</p>
            {content.contact_cta.body && (
              <p className="mt-1 text-muted-foreground">{content.contact_cta.body}</p>
            )}
          </Block>
        )}
      </div>
    </div>
  );
}

function Block({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="px-4 py-3 text-xs leading-relaxed">
      <div className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </div>
      <div>{children}</div>
    </div>
  );
}
