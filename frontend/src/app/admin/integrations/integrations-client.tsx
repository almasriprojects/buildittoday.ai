"use client";

import { useCallback, useEffect, useState } from "react";
import { AlertTriangle, Check, Copy, Search, Send, Link2, Sparkles } from "lucide-react";

type F = { set: boolean; hint: string | null; inDatabase: boolean; fromEnv: boolean };
type Data = {
  mode: "test" | "live";
  // Optional on purpose. A response served before this field existed — a
  // cached one, or a tab left open across a deploy — has no `email`, and a
  // page that reads straight through it crashes entirely rather than
  // degrading. Defaulted at the point of use below.
  email?: {
    sendingEnabled: boolean; testMode: boolean;
    dailyCap: number; redirectsTo: string | null;
  };
  telegram: {
    botToken: F; chatId: { set: boolean; value: string | null }; webhookSecret: F;
    ready: boolean; webhookUrl: string;
  };
  stripe: {
    secretKeyTest: F; secretKeyLive: F;
    webhookSecretTest: F; webhookSecretLive: F; webhookUrl: string;
  };
  resend: { apiKey: F; webhookSecret: F; webhookUrl: string };
  lob: { apiKey: F; enabled: boolean };
  cron: { set: boolean };
};

export function IntegrationsClient() {
  const [d, setD] = useState<Data | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [v, setV] = useState<Record<string, string>>({});

  const set = (k: string, val: string) => setV((p) => ({ ...p, [k]: val }));

  const load = useCallback(() => {
    fetch("/api/admin/integrations")
      .then((r) => r.json())
      .then((j) => {
        if (j.error) throw new Error(j.error);
        setD(j);
        setV((p) => ({ ...p, chatId: j.telegram.chatId.value ?? "" }));
      })
      .catch((e) => setErr(e.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  async function save(fields: string[], label = "Saved.") {
    setBusy("save"); setErr(null); setMsg(null);
    try {
      const body: Record<string, string> = {};
      for (const f of fields) if (v[f]?.trim()) body[f] = v[f].trim();
      if (!Object.keys(body).length) { setBusy(null); return; }
      const res = await fetch("/api/admin/integrations", {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error);
      // Never leave a secret sitting in the field after saving — it cannot be
      // read back, and leaving it visible invites a screenshot.
      setV((p) => { const n = { ...p }; for (const f of fields) if (f !== "chatId") n[f] = ""; return n; });
      setMsg(label); load();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Could not save.");
    } finally { setBusy(null); }
  }

  async function patch(body: Record<string, unknown>, label: string) {
    setBusy(JSON.stringify(body)); setErr(null); setMsg(null);
    try {
      const res = await fetch("/api/admin/integrations", {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error);
      setMsg(label); load();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Could not save.");
    } finally { setBusy(null); }
  }

  async function act(action: string, label: string) {
    setBusy(action); setErr(null); setMsg(null);
    try {
      const res = await fetch("/api/admin/integrations", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error);
      setMsg(j.chatId ? `Found chat id ${j.chatId}.` : label); load();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "That didn't work.");
    } finally { setBusy(null); }
  }

  if (loading) return <p className="py-10 text-center text-sm text-muted-foreground">Loading…</p>;
  if (!d) return <p role="alert" className="text-sm text-red-700">{err}</p>;

  // Defaulted here as well as on load: state can be set from more than one
  // place, and a page that shows "TEST" when it does not know is safe, whereas
  // one that crashes tells you nothing at all.
  const email = d.email ?? {
    sendingEnabled: false, testMode: true, dailyCap: 0, redirectsTo: null,
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Integrations</h1>
        <p className="mt-1 text-muted-foreground">
          Every key the system uses. Saved here they work immediately — no redeploy.
        </p>
      </div>

      {msg && <p className="text-sm text-emerald-700"><Check className="mr-1 inline h-3 w-3" />{msg}</p>}
      {err && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{err}</p>}

      {/* What is live.
          There was one switch here, labelled "Go live", and it only ever meant
          Stripe. Outreach has its own switch on the Email page and postcards a
          third below, so "are we live" had three answers in three places — and
          clicking the loudest one changed the least consequential. This states
          what each channel is doing, in one panel, and switches each from here. */}
      <div className="rounded-xl border bg-card p-5">
        <h2 className="text-sm font-semibold">What is live</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Three separate switches. Each changes what reaches the outside world.
        </p>

        <div className="mt-4 space-y-3">
          <LiveRow
            name="Payments"
            live={d.mode === "live"}
            liveText="Real cards are charged."
            testText="Test keys — no money moves."
            blocked={d.mode === "test" && !d.stripe.secretKeyLive.set
              ? "Add a live Stripe key below first." : null}
            busy={busy !== null}
            onToggle={() => patch(
              { mode: d.mode === "live" ? "test" : "live" },
              d.mode === "live" ? "Payments back in test mode."
                                : "Payments are LIVE — real cards will be charged.",
            )}
          />

          {/* The only switch here that puts a message in front of a stranger. */}
          <LiveRow
            name="Outreach email"
            live={!email.testMode}
            liveText={email.sendingEnabled
              ? `Emails go to the real business. Up to ${email.dailyCap} a day.`
              : "Would go to real businesses, but sending is switched off."}
            testText={`Redirected to ${email.redirectsTo ?? "the operator"} — no business is contacted.`}
            blocked={email.sendingEnabled ? null : "Sending is off — turn it on under Email."}
            busy={busy !== null}
            onToggle={() => {
              if (!email.testMode) {
                patch({ emailTestMode: true }, "Outreach back in test mode.");
                return;
              }
              const phrase = "SEND TO REAL BUSINESSES";
              const typed = window.prompt(
                `This sends real email to real businesses.\n\nType exactly:\n${phrase}`,
              );
              if (typed !== phrase) {
                if (typed !== null) setErr("Phrase didn't match — still in test mode.");
                return;
              }
              patch(
                { emailTestMode: false, confirmLive: phrase },
                "Outreach is LIVE — the next send goes to a real business.",
              );
            }}
          />

          <LiveRow
            name="Postcards"
            live={d.lob.enabled}
            liveText="Postcards are posted. Each one costs money."
            testText="Nothing is posted."
            blocked={!d.lob.apiKey.set ? "Add a Lob key below first." : null}
            busy={busy !== null}
            onToggle={() => patch(
              { postcardsEnabled: !d.lob.enabled },
              d.lob.enabled ? "Postcards off." : "Postcards ON — every send costs money.",
            )}
          />
        </div>
      </div>

      {/* Telegram */}
      <Card title="Telegram" ok={d.telegram.ready} okLabel="Connected">
        <Secret label="Bot token" f={d.telegram.botToken} value={v.botToken ?? ""}
          onChange={(x) => set("botToken", x)} placeholder="8123456789:AAH…"
          help={<>From <a href="https://t.me/BotFather" target="_blank" rel="noreferrer" className="underline">@BotFather</a> — send <code>/newbot</code>.</>} />

        <div className="mt-4">
          <label className="block text-xs font-medium text-muted-foreground">Chat id</label>
          <div className="mt-1.5 flex flex-wrap gap-2">
            <input value={v.chatId ?? ""} onChange={(e) => set("chatId", e.target.value)}
              placeholder="123456789"
              className="h-10 w-44 rounded-lg border bg-background px-3 font-mono text-sm outline-none focus:ring-2 focus:ring-ring" />
            <button onClick={() => act("detect_chat_id", "Chat id saved.")}
              disabled={busy !== null || !d.telegram.botToken.set}
              className="inline-flex h-10 items-center gap-1.5 rounded-lg border px-3 text-sm font-medium hover:bg-muted disabled:opacity-40">
              <Search className="h-3.5 w-3.5" /> Find it
            </button>
          </div>
          <p className="mt-1 text-[11px] text-muted-foreground">Message the bot first — it can&rsquo;t message you until you do.</p>
        </div>

        <div className="mt-4">
          <label className="block text-xs font-medium text-muted-foreground">Webhook secret</label>
          <div className="mt-1.5 flex flex-wrap items-center gap-2">
            <button onClick={() => act("generate_webhook_secret", "Secret generated.")}
              disabled={busy !== null}
              className="inline-flex h-10 items-center gap-1.5 rounded-lg border px-3 text-sm font-medium hover:bg-muted disabled:opacity-40">
              <Sparkles className="h-3.5 w-3.5" />{d.telegram.webhookSecret.set ? "Regenerate" : "Generate"}
            </button>
            {d.telegram.webhookSecret.set && <span className="font-mono text-xs text-muted-foreground">{d.telegram.webhookSecret.hint}</span>}
          </div>
          <p className="mt-1 text-[11px] text-muted-foreground">Not obtained anywhere — any random string. Let the panel make it.</p>
        </div>

        <Actions>
          <button onClick={() => save(["botToken", "chatId", "telegramWebhookSecret"])}
            disabled={busy !== null}
            className="h-10 rounded-lg bg-foreground px-4 text-sm font-medium text-background disabled:opacity-40">
            {busy === "save" ? "Saving…" : "Save"}
          </button>
          <button onClick={() => act("register_webhook", "Webhook registered — commands work now.")}
            disabled={busy !== null || !d.telegram.botToken.set || !d.telegram.webhookSecret.set}
            className="inline-flex h-10 items-center gap-1.5 rounded-lg border px-4 text-sm font-medium hover:bg-muted disabled:opacity-40">
            <Link2 className="h-3.5 w-3.5" /> Register webhook
          </button>
          <button onClick={() => act("test_message", "Sent — check Telegram.")}
            disabled={busy !== null || !d.telegram.ready}
            className="inline-flex h-10 items-center gap-1.5 rounded-lg bg-emerald-600 px-4 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-40">
            <Send className="h-3.5 w-3.5" /> Test message
          </button>
        </Actions>
      </Card>

      {/* Stripe */}
      <Card title="Stripe" ok={d.mode === "live" ? d.stripe.secretKeyLive.set : d.stripe.secretKeyTest.set}
        okLabel={d.mode === "live" ? "Live keys set" : "Test keys set"}>
        <Url label="Webhook URL — paste this into Stripe" url={d.stripe.webhookUrl} />
        <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
          Events to enable: <code>checkout.session.completed</code>,{" "}
          <code>customer.subscription.updated</code>, <code>customer.subscription.deleted</code>,{" "}
          <code>invoice.payment_failed</code>.
        </p>

        <div className="mt-5 grid gap-5 lg:grid-cols-2">
          <Pane label="Test" active={d.mode === "test"}>
            <Secret label="Secret key" f={d.stripe.secretKeyTest} value={v.stripeSecretKeyTest ?? ""}
              onChange={(x) => set("stripeSecretKeyTest", x)} placeholder="sk_test_…" />
            <Secret label="Webhook signing secret" f={d.stripe.webhookSecretTest} value={v.stripeWebhookSecretTest ?? ""}
              onChange={(x) => set("stripeWebhookSecretTest", x)} placeholder="whsec_…" />
          </Pane>
          <Pane label="Live" active={d.mode === "live"}>
            <Secret label="Secret key" f={d.stripe.secretKeyLive} value={v.stripeSecretKeyLive ?? ""}
              onChange={(x) => set("stripeSecretKeyLive", x)} placeholder="sk_live_…" />
            <Secret label="Webhook signing secret" f={d.stripe.webhookSecretLive} value={v.stripeWebhookSecretLive ?? ""}
              onChange={(x) => set("stripeWebhookSecretLive", x)} placeholder="whsec_…" />
          </Pane>
        </div>

        <Actions>
          <button onClick={() => save(["stripeSecretKeyTest","stripeSecretKeyLive","stripeWebhookSecretTest","stripeWebhookSecretLive"])}
            disabled={busy !== null}
            className="h-10 rounded-lg bg-foreground px-4 text-sm font-medium text-background disabled:opacity-40">
            Save Stripe keys
          </button>
        </Actions>
        <p className="mt-3 text-[11px] leading-relaxed text-muted-foreground">
          After adding live keys run <code>node scripts/stripe-setup.mjs</code> once to create the
          products and prices in your live account. It is safe to re-run.
        </p>
      </Card>

      {/* Resend */}
      <Card title="Resend" ok={d.resend.apiKey.set} okLabel="Sending ready">
        <Url label="Webhook URL — paste this into Resend" url={d.resend.webhookUrl} />
        <p className="mt-3 text-xs text-muted-foreground">
          Events: <code>email.bounced</code>, <code>email.complained</code>, <code>email.delivered</code>.
        </p>
        <div className="mt-4 space-y-4">
          <Secret label="API key" f={d.resend.apiKey} value={v.resendApiKey ?? ""}
            onChange={(x) => set("resendApiKey", x)} placeholder="re_…" />
          <Secret label="Webhook signing secret" f={d.resend.webhookSecret} value={v.resendWebhookSecret ?? ""}
            onChange={(x) => set("resendWebhookSecret", x)} placeholder="whsec_…" />
        </div>
        <Actions>
          <button onClick={() => save(["resendApiKey", "resendWebhookSecret"])}
            disabled={busy !== null}
            className="h-10 rounded-lg bg-foreground px-4 text-sm font-medium text-background disabled:opacity-40">
            Save Resend keys
          </button>
        </Actions>
      </Card>

      {/* Lob */}
      <Card title="Postcards (Lob)" ok={d.lob.enabled} okLabel="Enabled">
        <p className="text-sm text-muted-foreground">
          The only thing here that spends money per action, so holding a key and being switched on
          are deliberately separate.
        </p>
        <div className="mt-4">
          <Secret label="API key" f={d.lob.apiKey} value={v.lobApiKey ?? ""}
            onChange={(x) => set("lobApiKey", x)} placeholder="test_… or live_…" />
        </div>
        <Actions>
          <button onClick={() => save(["lobApiKey"])} disabled={busy !== null}
            className="h-10 rounded-lg bg-foreground px-4 text-sm font-medium text-background disabled:opacity-40">
            Save key
          </button>
          <button
            onClick={() => patch({ postcardsEnabled: !d.lob.enabled },
              d.lob.enabled ? "Postcards switched off." : "Postcards enabled — mail will cost money.")}
            disabled={busy !== null || !d.lob.apiKey.set}
            className={`h-10 rounded-lg px-4 text-sm font-medium text-white disabled:opacity-40 ${
              d.lob.enabled ? "bg-neutral-800 hover:bg-neutral-700" : "bg-amber-600 hover:bg-amber-700"}`}>
            {d.lob.enabled ? "Switch off" : "Enable postcards"}
          </button>
        </Actions>
      </Card>

      <div className="rounded-xl border bg-card p-5">
        <h2 className="text-sm font-semibold">Cron secret</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Stays in Vercel. The scheduled jobs live in the database and send this to authenticate —
          keeping it here as well would be circular.
        </p>
        <div className="mt-3">
          <Env label="CRON_SECRET" ok={d.cron.set} />
        </div>
      </div>
    </div>
  );
}

function Card({ title, ok, okLabel, children }: {
  title: string; ok: boolean; okLabel: string; children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border bg-card p-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold">{title}</h2>
        <span className={`rounded-full px-3 py-1 text-xs font-medium ${
          ok ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-900"}`}>
          {ok ? okLabel : "Not set up"}
        </span>
      </div>
      {children}
    </div>
  );
}

function Pane({ label, active, children }: { label: string; active: boolean; children: React.ReactNode }) {
  return (
    <div className={`rounded-lg border p-4 ${active ? "border-foreground/40 bg-muted/30" : ""}`}>
      <div className="mb-3 flex items-center gap-2">
        <span className="text-xs font-semibold uppercase tracking-wide">{label}</span>
        {active && <span className="rounded-full bg-foreground px-2 py-0.5 text-[10px] font-medium text-background">in use</span>}
      </div>
      <div className="space-y-4">{children}</div>
    </div>
  );
}

function Secret({ label, f, value, onChange, placeholder, help }: {
  label: string; f: F; value: string; onChange: (v: string) => void;
  placeholder: string; help?: React.ReactNode;
}) {
  return (
    <div>
      <div className="flex items-center justify-between gap-2">
        <label className="text-xs font-medium text-muted-foreground">{label}</label>
        {f.set && (
          <span className="font-mono text-[11px] text-muted-foreground">
            {f.hint ?? "set"}{f.fromEnv ? " · from Vercel" : ""}
          </span>
        )}
      </div>
      <input type="password" value={value} onChange={(e) => onChange(e.target.value)}
        placeholder={f.set ? "Saved — type to replace" : placeholder}
        className="mt-1.5 h-10 w-full rounded-lg border bg-background px-3 font-mono text-sm outline-none focus:ring-2 focus:ring-ring" />
      {help && <p className="mt-1 text-[11px] text-muted-foreground">{help}</p>}
    </div>
  );
}

function Url({ label, url }: { label: string; url: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div>
      <label className="block text-xs font-medium text-muted-foreground">{label}</label>
      <div className="mt-1.5 flex gap-2">
        <input readOnly value={url}
          className="h-10 flex-1 rounded-lg border bg-muted/40 px-3 font-mono text-xs" />
        <button
          onClick={() => { navigator.clipboard?.writeText(url); setCopied(true); setTimeout(() => setCopied(false), 1600); }}
          className="inline-flex h-10 shrink-0 items-center gap-1.5 rounded-lg border px-3 text-xs font-medium hover:bg-muted">
          <Copy className="h-3.5 w-3.5" />{copied ? "Copied" : "Copy"}
        </button>
      </div>
    </div>
  );
}

function Actions({ children }: { children: React.ReactNode }) {
  return <div className="mt-5 flex flex-wrap gap-2 border-t pt-4">{children}</div>;
}

function Env({ label, ok }: { label: string; ok: boolean }) {
  return (
    <div className={`inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm ${
      ok ? "border-emerald-200 bg-emerald-50" : "border-amber-200 bg-amber-50"}`}>
      {ok ? <Check className="h-4 w-4 text-emerald-700" /> : <AlertTriangle className="h-4 w-4 text-amber-700" />}
      <span className={ok ? "text-emerald-900" : "text-amber-900"}>{label}</span>
    </div>
  );
}

/**
 * One channel, what it is doing right now, and the switch.
 *
 * Colour carries the meaning: red is "this reaches the outside world". A live
 * channel must never sit there quietly green.
 */
function LiveRow({
  name, live, liveText, testText, blocked, busy, onToggle,
}: {
  name: string; live: boolean; liveText: string; testText: string;
  blocked: string | null; busy: boolean; onToggle: () => void;
}) {
  return (
    <div className={`flex flex-wrap items-center justify-between gap-3 rounded-lg border-2 p-3 ${
      live ? "border-red-300 bg-red-50" : "border-emerald-300 bg-emerald-50"}`}>
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">{name}</span>
          <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
            live ? "bg-red-600 text-white" : "bg-emerald-600 text-white"}`}>
            {live ? "LIVE" : "TEST"}
          </span>
        </div>
        <p className={`mt-0.5 text-xs ${live ? "text-red-800" : "text-emerald-800"}`}>
          {live ? liveText : testText}
        </p>
        {blocked && <p className="mt-1 text-xs text-muted-foreground">{blocked}</p>}
      </div>
      <button
        onClick={onToggle}
        disabled={busy || (!live && Boolean(blocked))}
        className={`h-9 shrink-0 rounded-lg px-3 text-sm font-medium text-white disabled:opacity-40 ${
          live ? "bg-neutral-800 hover:bg-neutral-700" : "bg-red-600 hover:bg-red-700"}`}
      >
        {live ? "Back to test" : "Go live"}
      </button>
    </div>
  );
}
