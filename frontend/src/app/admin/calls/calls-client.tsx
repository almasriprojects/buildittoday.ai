"use client";

import { useEffect, useState } from "react";
import { Phone, ExternalLink, Loader2, RotateCw } from "lucide-react";

type CallRow = {
  lead_id: string;
  business_name: string;
  city: string | null;
  category: string | null;
  phone: string;
  url: string | null;
  emailed_at: string | null;
  viewed_at: string | null;
  has_script: boolean;
  last_outcome: string | null;
  last_called_at: string | null;
  attempts: number;
};

type Counts = {
  total: number; uncalled: number; scripted: number; interested: number;
  callBack: number; sold: number; notInterested: number; noAnswer: number;
  totalAttempts: number;
};

type Script = {
  opening?: string; why_them?: string; the_ask?: string;
  site_walkthrough?: string; price_answer?: string;
  price_ladder?: string[];
  objections?: { they_say?: string; you_say?: string }[];
  close?: string; voicemail?: string; do_not_say?: string[];
};

const OUTCOMES: { key: string; label: string; tone: string }[] = [
  { key: "no_answer",      label: "No answer",      tone: "bg-neutral-100 text-neutral-700 hover:bg-neutral-200" },
  { key: "wrong_number",   label: "Wrong number",   tone: "bg-neutral-100 text-neutral-700 hover:bg-neutral-200" },
  { key: "not_interested", label: "Not interested", tone: "bg-red-50 text-red-700 hover:bg-red-100" },
  { key: "call_back",      label: "Call back",      tone: "bg-amber-50 text-amber-800 hover:bg-amber-100" },
  { key: "interested",     label: "Interested",     tone: "bg-emerald-50 text-emerald-700 hover:bg-emerald-100" },
  { key: "sold",           label: "Sold",           tone: "bg-emerald-600 text-white hover:bg-emerald-700" },
];

const OUTCOME_LABEL: Record<string, string> = Object.fromEntries(
  OUTCOMES.map((o) => [o.key, o.label]),
);

/** Digits only, so 8636625893 dials and (863) 662-5893 reads. */
function pretty(phone: string) {
  const d = phone.replace(/\D/g, "");
  if (d.length === 10) return `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`;
  if (d.length === 11 && d[0] === "1") return `(${d.slice(1, 4)}) ${d.slice(4, 7)}-${d.slice(7)}`;
  return phone;
}

export function CallsClient() {
  const [rows, setRows] = useState<CallRow[]>([]);
  const [counts, setCounts] = useState<Counts | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [openId, setOpenId] = useState<string | null>(null);
  const [script, setScript] = useState<Script | null>(null);
  const [scriptBusy, setScriptBusy] = useState(false);
  const [scriptErr, setScriptErr] = useState<string | null>(null);

  const [notes, setNotes] = useState("");
  const [setup, setSetup] = useState("");
  const [monthly, setMonthly] = useState("");
  const [saving, setSaving] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/calls");
      const text = await res.text();
      if (!res.ok) throw new Error(text.slice(0, 200) || `Server returned ${res.status}`);
      const data = JSON.parse(text);
      setRows(data.calls ?? []);
      setCounts(data.counts ?? null);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load the call list.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function openLead(row: CallRow) {
    if (openId === row.lead_id) { setOpenId(null); return; }
    setOpenId(row.lead_id);
    setScript(null); setScriptErr(null);
    setNotes(""); setSetup(""); setMonthly("");
    await getScript(row.lead_id, false);
  }

  async function getScript(leadId: string, force: boolean) {
    setScriptBusy(true); setScriptErr(null);
    try {
      const res = await fetch("/api/admin/calls/script", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ leadId, force }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.ok) throw new Error(data?.error ?? `Server returned ${res.status}`);
      setScript(data.script as Script);
      if (!data.cached) {
        setRows((rs) => rs.map((r) => (r.lead_id === leadId ? { ...r, has_script: true } : r)));
      }
    } catch (e) {
      setScriptErr(e instanceof Error ? e.message : "Could not write the script.");
    } finally {
      setScriptBusy(false);
    }
  }

  async function record(leadId: string, outcome: string) {
    setSaving(outcome);
    try {
      const res = await fetch("/api/admin/calls", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          leadId, outcome,
          notes,
          quotedSetup: setup ? Number(setup) : null,
          quotedMonthly: monthly ? Number(monthly) : null,
        }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d?.error ?? `Server returned ${res.status}`);
      }
      setOpenId(null);
      await load();
    } catch (e) {
      setScriptErr(e instanceof Error ? e.message : "Could not save that.");
    } finally {
      setSaving(null);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 py-16 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading the call list…
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl border border-red-300 bg-red-50 p-4 text-sm text-red-800">
        <p className="font-medium">Could not load the call list.</p>
        <p className="mt-1">{error}</p>
        <button onClick={load} className="mt-3 rounded-md bg-red-700 px-3 py-1.5 text-xs font-medium text-white">
          Try again
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {counts && (
        <div className="grid grid-cols-2 gap-px overflow-hidden rounded-xl border bg-border sm:grid-cols-3 lg:grid-cols-6">
          {[
            ["To call", counts.uncalled, "never rung"],
            ["On the list", counts.total, "approved site + phone"],
            ["Calls made", counts.totalAttempts, "all attempts"],
            ["Call back", counts.callBack, "asked you to"],
            ["Interested", counts.interested, "said yes to a look"],
            ["Sold", counts.sold, "paid or agreed"],
          ].map(([label, value, hint]) => (
            <div key={String(label)} className="bg-background p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
              <p className="mt-1 text-2xl font-semibold tabular-nums">{value as number}</p>
              <p className="text-xs text-muted-foreground">{hint}</p>
            </div>
          ))}
        </div>
      )}

      {counts?.total === 0 && (
        <div className="rounded-xl border bg-muted/30 p-5 text-sm">
          <p className="font-medium">Nobody is callable yet.</p>
          <p className="mt-1 text-muted-foreground">
            A business appears here once its site is approved <em>and</em> the lead has a phone
            number. Approve sites on the Generated Sites page.
          </p>
        </div>
      )}

      <div className="space-y-2">
        {rows.map((row) => {
          const open = openId === row.lead_id;
          return (
            <div key={row.lead_id} className={`rounded-xl border ${open ? "border-foreground" : ""}`}>
              <button
                onClick={() => openLead(row)}
                className="flex w-full flex-wrap items-center gap-x-4 gap-y-2 p-4 text-left"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{row.business_name}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {[row.city, row.category].filter(Boolean).join(" · ")}
                  </p>
                </div>

                <span className="font-mono text-sm tabular-nums">{pretty(row.phone)}</span>

                <div className="flex flex-wrap items-center gap-1.5">
                  {row.viewed_at && <Pill tone="good">opened their site</Pill>}
                  {row.emailed_at && !row.viewed_at && <Pill tone="mut">emailed</Pill>}
                  {!row.emailed_at && <Pill tone="mut">never contacted</Pill>}
                  {row.last_outcome && (
                    <Pill tone={row.last_outcome === "sold" || row.last_outcome === "interested" ? "good" : "warn"}>
                      {OUTCOME_LABEL[row.last_outcome] ?? row.last_outcome}
                      {row.attempts > 1 ? ` ×${row.attempts}` : ""}
                    </Pill>
                  )}
                </div>
              </button>

              {open && (
                <div className="space-y-5 border-t p-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <a
                      href={`tel:${row.phone.replace(/\D/g, "")}`}
                      className="inline-flex h-9 items-center gap-2 rounded-lg bg-foreground px-4 text-sm font-medium text-background"
                    >
                      <Phone className="h-3.5 w-3.5" /> Call {pretty(row.phone)}
                    </a>
                    {row.url && (
                      <a
                        href={row.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex h-9 items-center gap-2 rounded-lg border px-3 text-sm"
                      >
                        <ExternalLink className="h-3.5 w-3.5" /> Their site
                      </a>
                    )}
                    <button
                      onClick={() => getScript(row.lead_id, true)}
                      disabled={scriptBusy}
                      className="inline-flex h-9 items-center gap-2 rounded-lg border px-3 text-sm text-muted-foreground disabled:opacity-50"
                      title="Writes a new script and spends model credit"
                    >
                      <RotateCw className="h-3.5 w-3.5" /> Rewrite script
                    </button>
                  </div>

                  {scriptBusy && !script && (
                    <p className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin" /> Writing a script for {row.business_name}…
                    </p>
                  )}
                  {scriptErr && (
                    <p className="rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-800">{scriptErr}</p>
                  )}

                  {script && <ScriptView s={script} />}

                  <div className="space-y-3 rounded-lg border bg-muted/30 p-4">
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      What happened
                    </p>
                    <textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      rows={3}
                      placeholder="What they actually said — especially about the price. This is the only record of it."
                      className="w-full rounded-md border bg-background p-2.5 text-sm"
                    />
                    <div className="flex flex-wrap items-center gap-3">
                      <label className="flex items-center gap-2 text-sm">
                        <span className="text-muted-foreground">Quoted setup $</span>
                        <input
                          value={setup} onChange={(e) => setSetup(e.target.value)}
                          inputMode="decimal" placeholder="750"
                          className="w-24 rounded-md border bg-background px-2 py-1 text-sm tabular-nums"
                        />
                      </label>
                      <label className="flex items-center gap-2 text-sm">
                        <span className="text-muted-foreground">Monthly $</span>
                        <input
                          value={monthly} onChange={(e) => setMonthly(e.target.value)}
                          inputMode="decimal" placeholder="50"
                          className="w-24 rounded-md border bg-background px-2 py-1 text-sm tabular-nums"
                        />
                      </label>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {OUTCOMES.map((o) => (
                        <button
                          key={o.key}
                          onClick={() => record(row.lead_id, o.key)}
                          disabled={saving !== null}
                          className={`rounded-md px-3 py-1.5 text-xs font-medium transition disabled:opacity-50 ${o.tone}`}
                        >
                          {saving === o.key ? "Saving…" : o.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Pill({ tone, children }: { tone: "good" | "warn" | "mut"; children: React.ReactNode }) {
  const cls = {
    good: "bg-emerald-50 text-emerald-700 border-emerald-200",
    warn: "bg-amber-50 text-amber-800 border-amber-200",
    mut:  "bg-muted text-muted-foreground border-transparent",
  }[tone];
  return <span className={`rounded border px-1.5 py-0.5 text-[11px] font-medium ${cls}`}>{children}</span>;
}

function ScriptView({ s }: { s: Script }) {
  return (
    <div className="space-y-4 rounded-lg border bg-background p-4">
      <Block label="Open with this" body={s.opening} lead />
      {s.why_them && <Block label="Why them" body={s.why_them} />}
      <Block label="Get them to the site" body={s.the_ask} />
      {s.site_walkthrough && <Block label="While they look" body={s.site_walkthrough} />}
      <Block label="When they ask the price" body={s.price_answer} />

      {s.price_ladder && s.price_ladder.length > 0 && (
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Price ladder — walk down it, don&apos;t jump
          </p>
          <ol className="mt-1.5 space-y-1">
            {s.price_ladder.map((step, i) => (
              <li key={i} className="flex gap-2 text-sm">
                <span className="font-mono text-xs text-muted-foreground">{i + 1}</span>
                <span>{step}</span>
              </li>
            ))}
          </ol>
        </div>
      )}

      {s.objections && s.objections.length > 0 && (
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">If they say</p>
          <div className="mt-1.5 space-y-2.5">
            {s.objections.map((o, i) => (
              <div key={i} className="border-l-2 pl-3">
                <p className="text-sm italic text-muted-foreground">&ldquo;{o.they_say}&rdquo;</p>
                <p className="text-sm">{o.you_say}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      <Block label="Close" body={s.close} />

      {s.voicemail && (
        <div className="rounded-md bg-muted/50 p-3">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Voicemail — most calls end here
          </p>
          <p className="mt-1 text-sm">{s.voicemail}</p>
        </div>
      )}

      {s.do_not_say && s.do_not_say.length > 0 && (
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-red-700">Do not say</p>
          <ul className="mt-1 space-y-0.5">
            {s.do_not_say.map((d, i) => (
              <li key={i} className="text-sm text-muted-foreground">— {d}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function Block({ label, body, lead }: { label: string; body?: string; lead?: boolean }) {
  if (!body) return null;
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className={`mt-1 ${lead ? "text-[15px] font-medium leading-relaxed" : "text-sm"}`}>{body}</p>
    </div>
  );
}
