"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, ExternalLink, Monitor, Smartphone, Tablet, RotateCw } from "lucide-react";
import { SiteReview, type ReviewStatus } from "./site-review";
import { SiteCopy, type GeneratedContent } from "./site-copy";
import { SiteCode } from "./site-code";
import { SiteNav, neighbourHref, type NavContext } from "./site-nav";
import { Code2, Eye } from "lucide-react";

type Device = "desktop" | "tablet" | "mobile";

const DEVICES: Record<Device, { w: number; label: string; icon: typeof Monitor }> = {
  desktop: { w: 1280, label: "Desktop", icon: Monitor },
  tablet: { w: 768, label: "Tablet", icon: Tablet },
  mobile: { w: 375, label: "Mobile", icon: Smartphone },
};

export function SitePreview({
  slug,
  navCtx,
  lead,
  build,
  content,
  review,
}: {
  slug: string;
  navCtx: NavContext | null;
  content: GeneratedContent | null;
  review: {
    status: ReviewStatus;
    note: string | null;
    reviewedAt: string | null;
    reviewedBy: string | null;
  };
  lead: {
    business_name: string;
    business_category: string | null;
    city: string | null;
    state: string | null;
    contact_email: string | null;
    contact_phone: string | null;
    owner_full_name: string | null;
    mailing: string;
    outreach_sent_at: string | null;
    postcard_sent: boolean;
    demo_viewed_at: string | null;
  };
  build: {
    generator_version: string | null;
    generated_at: string | null;
    clip_count: number | null;
    has_video: boolean;
    palette: Record<string, string> | null;
    scenes: { idx: number; scene_name: string; video_ok: boolean; text_detected?: boolean | null; text_severity?: string | null }[];
  };
}) {
  // Everything that would make this embarrassing to send, computed once so it
  // sits above the fold rather than being discovered by scrolling.
  const flags: { tone: "warn" | "mid"; text: string }[] = [];
  if (!build.has_video) {
    flags.push({ tone: "warn", text: "No video hero — built on an older pipeline" });
  } else if (build.clip_count !== null && build.clip_count < 3) {
    flags.push({ tone: "mid", text: `Only ${build.clip_count} of 3 hero scenes rendered` });
  }
  const badText = build.scenes.filter((s) => s.text_severity === "bad");
  if (badText.length) {
    flags.push({
      tone: "warn",
      text: `Garbled AI text in ${badText.length} image${badText.length > 1 ? "s" : ""} — regenerate before sending`,
    });
  }
  if (!lead.contact_email && !lead.mailing) {
    flags.push({ tone: "warn", text: "No email and no mailing address — unreachable" });
  }

  const [device, setDevice] = useState<Device>("desktop");
  const [view, setView] = useState<"preview" | "code">("preview");
  const [nonce, setNonce] = useState(0);
  const src = `/demo-sites/${slug}?admin=1&r=${nonce}`;
  const isSent = Boolean(lead.outreach_sent_at || lead.postcard_sent);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link
            href="/admin/sites"
            className="mb-2 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> All generated sites
          </Link>
          <h1 className="text-2xl font-bold tracking-tight">{lead.business_name}</h1>
          <p className="text-sm text-muted-foreground">
            {[lead.business_category, [lead.city, lead.state].filter(Boolean).join(", ")]
              .filter(Boolean)
              .join(" · ")}{" "}
            · <span className="font-mono text-xs">{slug}</span>
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <SiteNav ctx={navCtx} />

          <div className="flex rounded-lg border p-0.5">
            {([
              ["preview", "Preview", Eye],
              ["code", "Code", Code2],
            ] as const).map(([v, label, Icon]) => (
              <button
                key={v}
                onClick={() => setView(v)}
                aria-pressed={view === v}
                className={`inline-flex h-8 items-center gap-1.5 rounded-md px-2.5 text-xs font-medium transition ${
                  view === v
                    ? "bg-foreground text-background"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                {label}
              </button>
            ))}
          </div>

          <div className={`flex rounded-lg border p-0.5 ${view === "code" ? "hidden" : ""}`}>
            {(Object.keys(DEVICES) as Device[]).map((d) => {
              const Icon = DEVICES[d].icon;
              return (
                <button
                  key={d}
                  onClick={() => setDevice(d)}
                  title={`${DEVICES[d].label} (${DEVICES[d].w}px)`}
                  aria-pressed={device === d}
                  className={`inline-flex h-8 items-center gap-1.5 rounded-md px-2.5 text-xs font-medium transition ${
                    device === d
                      ? "bg-foreground text-background"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">{DEVICES[d].label}</span>
                </button>
              );
            })}
          </div>
          <button
            onClick={() => setNonce((n) => n + 1)}
            title="Reload preview"
            className={`inline-flex h-9 items-center gap-1.5 rounded-lg border px-3 text-xs font-medium text-muted-foreground transition hover:text-foreground ${
              view === "code" ? "hidden" : ""
            }`}
          >
            <RotateCw className="h-3.5 w-3.5" /> Reload
          </button>
          <a
            href={`/demo-sites/${slug}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-foreground px-3.5 text-xs font-medium text-background transition hover:opacity-90"
          >
            <ExternalLink className="h-3.5 w-3.5" /> Open full page
          </a>
        </div>
      </div>

      {flags.length > 0 && (
        <div className="space-y-1.5 rounded-xl border border-amber-300 bg-amber-50 p-3.5">
          <p className="text-xs font-semibold uppercase tracking-wide text-amber-900">
            Check before sending
          </p>
          <ul className="space-y-1">
            {flags.map((f) => (
              <li key={f.text} className="flex items-start gap-2 text-sm text-amber-900">
                <span
                  className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${
                    f.tone === "warn" ? "bg-red-500" : "bg-amber-500"
                  }`}
                />
                {f.text}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="grid gap-5 lg:grid-cols-[1fr_300px]">
        {/* Live preview */}
        <div className="overflow-hidden rounded-xl border bg-muted/30">
          <div className="flex items-center gap-2 border-b bg-muted/60 px-4 py-2">
            <span className="h-2.5 w-2.5 rounded-full bg-red-400" />
            <span className="h-2.5 w-2.5 rounded-full bg-amber-400" />
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
            <span className="ml-2 truncate font-mono text-[11px] text-muted-foreground">
              /demo-sites/{slug}
            </span>
            <span className="ml-auto text-[11px] text-muted-foreground">
              {view === "code" ? "source" : `${DEVICES[device].w}px`}
            </span>
          </div>
          {view === "preview" ? (
            <div className="flex justify-center overflow-x-auto bg-neutral-100 p-4 dark:bg-neutral-900">
              <iframe
                key={`${device}-${nonce}`}
                src={src}
                title={`${lead.business_name} demo preview`}
                style={{ width: DEVICES[device].w, height: 780 }}
                className="shrink-0 rounded-lg border bg-white shadow-sm"
              />
            </div>
          ) : (
            <SiteCode slug={slug} onSaved={() => setNonce((n) => n + 1)} />
          )}
          <div className="border-t p-4">
            <SiteCopy
              content={content}
              businessName={lead.business_name}
              category={lead.business_category}
            />
          </div>
        </div>

        {/* Details */}
        <aside className="space-y-4">
          <SiteReview
            slug={slug}
            initialStatus={review.status}
            initialNote={review.note}
            reviewedAt={review.reviewedAt}
            reviewedBy={review.reviewedBy}
            nextHref={navCtx ? neighbourHref(navCtx, 1) : null}
          />

          <Panel title="Status">
            <Row label="Outreach">
              {isSent ? <Pill tone="mid">sent</Pill> : <Pill tone="muted">not sent</Pill>}
            </Row>
            <Row label="Viewed">
              {lead.demo_viewed_at ? (
                <Pill tone="good">{new Date(lead.demo_viewed_at).toLocaleDateString()}</Pill>
              ) : (
                <Pill tone="muted">never</Pill>
              )}
            </Row>
            <Row label="Quality">
              {!build.has_video ? (
                <Pill tone="warn">no video</Pill>
              ) : build.clip_count === 3 ? (
                <Pill tone="good">3-clip video</Pill>
              ) : (
                <Pill tone="mid">{build.clip_count}-clip video</Pill>
              )}
            </Row>
          </Panel>

          <Panel title="Contact">
            <Row label="Owner">{lead.owner_full_name ?? "—"}</Row>
            <Row label="Email">
              {lead.contact_email ? (
                <span className="break-all text-xs">{lead.contact_email}</span>
              ) : (
                <Pill tone="warn">none</Pill>
              )}
            </Row>
            <Row label="Phone">{lead.contact_phone ?? "—"}</Row>
            <Row label="Mail">
              {lead.mailing ? <span className="text-xs">{lead.mailing}</span> : <Pill tone="warn">none</Pill>}
            </Row>
          </Panel>

          <Panel title="Build">
            <Row label="Generated">
              {build.generated_at ? new Date(build.generated_at).toLocaleDateString() : "—"}
            </Row>
            <Row label="Version">
              <span className="font-mono text-[11px]">{build.generator_version ?? "—"}</span>
            </Row>
            {build.palette && (
              <Row label="Palette">
                <div className="flex gap-1">
                  {["primary", "secondary", "accent", "background"].map((k) =>
                    build.palette?.[k] ? (
                      <span
                        key={k}
                        title={`${k}: ${build.palette[k]}`}
                        className="h-5 w-5 rounded border"
                        style={{ backgroundColor: build.palette[k] }}
                      />
                    ) : null
                  )}
                </div>
              </Row>
            )}
          </Panel>

          {build.scenes.length > 0 && (
            <Panel title="Hero scenes">
              <ul className="space-y-2">
                {build.scenes.map((s) => (
                  <li key={s.idx} className="flex items-start gap-2 text-xs">
                    <span
                      className={`mt-1 h-1.5 w-1.5 shrink-0 rounded-full ${
                        s.video_ok ? "bg-emerald-500" : "bg-red-400"
                      }`}
                    />
                    <span className="min-w-0 flex-1">
                      <span className={s.video_ok ? "" : "text-muted-foreground line-through"}>
                        {s.scene_name}
                      </span>
                      <span className="mt-1 flex flex-wrap gap-1">
                        {!s.video_ok && <Pill tone="warn">video blocked</Pill>}
                        {s.text_severity === "bad" && <Pill tone="warn">garbled text</Pill>}
                        {s.text_severity === "minor" && (
                          <Pill tone="muted">minor text</Pill>
                        )}
                      </span>
                    </span>
                  </li>
                ))}
              </ul>
            </Panel>
          )}
        </aside>
      </div>
    </div>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border bg-card p-4">
      <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {title}
      </h2>
      <div className="space-y-2.5">{children}</div>
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3 text-sm">
      <span className="shrink-0 text-muted-foreground">{label}</span>
      <span className="text-right">{children}</span>
    </div>
  );
}

function Pill({
  children,
  tone,
}: {
  children: React.ReactNode;
  tone: "good" | "mid" | "warn" | "muted";
}) {
  const tones = {
    good: "bg-emerald-100 text-emerald-700",
    mid: "bg-amber-100 text-amber-800",
    warn: "bg-red-100 text-red-700",
    muted: "bg-muted text-muted-foreground",
  };
  return (
    <span className={`inline-block rounded-full px-2 py-0.5 text-[11px] font-medium ${tones[tone]}`}>
      {children}
    </span>
  );
}
