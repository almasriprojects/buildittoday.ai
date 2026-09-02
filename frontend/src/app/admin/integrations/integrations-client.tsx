"use client";

import { useCallback, useEffect, useState } from "react";
import { AlertTriangle, Check, Send, Sparkles, Link2, Search } from "lucide-react";

type Field = { set: boolean; hint?: string | null; value?: string | null };
type Data = {
  telegram: {
    botToken: Field;
    chatId: Field;
    webhookSecret: Field;
    ready: boolean;
    fromEnvOnly: boolean;
    webhookUrl: string;
    updatedAt: string | null;
  };
  environment: Record<string, boolean | string | null>;
};

export function IntegrationsClient() {
  const [d, setD] = useState<Data | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const [token, setToken] = useState("");
  const [chatId, setChatId] = useState("");

  const load = useCallback(() => {
    fetch("/api/admin/integrations")
      .then((r) => r.json())
      .then((j) => {
        if (j.error) throw new Error(j.error);
        setD(j);
        setChatId(j.telegram.chatId.value ?? "");
      })
      .catch((e) => setErr(e.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  async function save() {
    setBusy("save"); setErr(null); setMsg(null);
    try {
      const body: Record<string, string> = {};
      if (token.trim()) body.botToken = token.trim();
      if (chatId.trim()) body.chatId = chatId.trim();
      const res = await fetch("/api/admin/integrations", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error);
      // Never keep the token in the field after saving — it cannot be read
      // back, and leaving it visible invites a screenshot.
      setToken("");
      setMsg("Saved.");
      load();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Could not save.");
    } finally { setBusy(null); }
  }

  async function act(action: string, label: string) {
    setBusy(action); setErr(null); setMsg(null);
    try {
      const res = await fetch("/api/admin/integrations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error);
      setMsg(j.chatId ? `Found chat id ${j.chatId}.` : label);
      load();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "That didn't work.");
    } finally { setBusy(null); }
  }

  if (loading) return <p className="py-10 text-center text-sm text-muted-foreground">Loading…</p>;
  if (!d) return <p role="alert" className="text-sm text-red-700">{err}</p>;

  const t = d.telegram;
  const step = (n: number, done: boolean) =>
    `flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${
      done ? "bg-emerald-600 text-white" : "bg-muted text-muted-foreground"
    }`;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Integrations</h1>
        <p className="mt-1 text-muted-foreground">
          Keys live here rather than in Vercel — saved here they work immediately, with no redeploy.
        </p>
      </div>

      {msg && <p className="text-sm text-emerald-700"><Check className="mr-1 inline h-3 w-3" />{msg}</p>}
      {err && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{err}</p>}

      <div className="rounded-xl border bg-card p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold">Telegram</h2>
          <span className={`rounded-full px-3 py-1 text-xs font-medium ${
            t.ready ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-900"}`}>
            {t.ready ? "Connected" : "Not connected yet"}
          </span>
        </div>

        {t.fromEnvOnly && (
          <p className="mt-3 rounded-lg border border-blue-200 bg-blue-50 px-4 py-2.5 text-sm text-blue-900">
            Currently using the token from Vercel. Anything you save here takes over.
          </p>
        )}

        {/* Step 1 */}
        <div className="mt-6 flex gap-3">
          <span className={step(1, t.botToken.set)}>1</span>
          <div className="min-w-0 flex-1">
            <h3 className="text-sm font-semibold">Bot token</h3>
            <p className="mt-0.5 text-sm text-muted-foreground">
              Message <a href="https://t.me/BotFather" target="_blank" rel="noreferrer"
                className="font-medium text-foreground underline">@BotFather</a> on Telegram,
              send <code className="rounded bg-muted px-1">/newbot</code>, and paste what it gives you.
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              <input
                type="password"
                value={token}
                onChange={(e) => setToken(e.target.value)}
                placeholder={t.botToken.set ? `Saved — ${t.botToken.hint}` : "8123456789:AAH…"}
                className="h-10 min-w-[260px] flex-1 rounded-lg border bg-background px-3 font-mono text-sm outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
          </div>
        </div>

        {/* Step 2 */}
        <div className="mt-5 flex gap-3">
          <span className={step(2, t.chatId.set)}>2</span>
          <div className="min-w-0 flex-1">
            <h3 className="text-sm font-semibold">Your chat id</h3>
            <p className="mt-0.5 text-sm text-muted-foreground">
              Send your new bot any message first — it can&rsquo;t message you until you do. Then
              press Find it.
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              <input
                value={chatId}
                onChange={(e) => setChatId(e.target.value)}
                placeholder="123456789"
                className="h-10 w-44 rounded-lg border bg-background px-3 font-mono text-sm outline-none focus:ring-2 focus:ring-ring"
              />
              <button
                onClick={() => act("detect_chat_id", "Chat id saved.")}
                disabled={busy !== null || !t.botToken.set}
                className="inline-flex h-10 items-center gap-1.5 rounded-lg border px-3 text-sm font-medium hover:bg-muted disabled:opacity-40"
              >
                <Search className="h-3.5 w-3.5" /> Find it for me
              </button>
            </div>
          </div>
        </div>

        {/* Step 3 */}
        <div className="mt-5 flex gap-3">
          <span className={step(3, t.webhookSecret.set)}>3</span>
          <div className="min-w-0 flex-1">
            <h3 className="text-sm font-semibold">Webhook secret</h3>
            <p className="mt-0.5 text-sm text-muted-foreground">
              This isn&rsquo;t obtained from anywhere — it&rsquo;s any random string, used to prove
              incoming commands really came from Telegram. Let the panel make one.
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <button
                onClick={() => act("generate_webhook_secret", "Secret generated.")}
                disabled={busy !== null}
                className="inline-flex h-10 items-center gap-1.5 rounded-lg border px-3 text-sm font-medium hover:bg-muted disabled:opacity-40"
              >
                <Sparkles className="h-3.5 w-3.5" />
                {t.webhookSecret.set ? "Generate a new one" : "Generate"}
              </button>
              {t.webhookSecret.set && (
                <span className="font-mono text-xs text-muted-foreground">{t.webhookSecret.hint}</span>
              )}
            </div>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap gap-2 border-t pt-5">
          <button
            onClick={save}
            disabled={busy !== null || (!token.trim() && chatId === (t.chatId.value ?? ""))}
            className="inline-flex h-10 items-center rounded-lg bg-foreground px-4 text-sm font-medium text-background disabled:opacity-40"
          >
            {busy === "save" ? "Saving…" : "Save"}
          </button>
          <button
            onClick={() => act("register_webhook", "Webhook registered — commands will work now.")}
            disabled={busy !== null || !t.botToken.set || !t.webhookSecret.set}
            className="inline-flex h-10 items-center gap-1.5 rounded-lg border px-4 text-sm font-medium hover:bg-muted disabled:opacity-40"
          >
            <Link2 className="h-3.5 w-3.5" /> Register webhook
          </button>
          <button
            onClick={() => act("test_message", "Sent — check Telegram.")}
            disabled={busy !== null || !t.ready}
            className="inline-flex h-10 items-center gap-1.5 rounded-lg bg-emerald-600 px-4 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-40"
          >
            <Send className="h-3.5 w-3.5" /> Send a test message
          </button>
        </div>

        <p className="mt-4 text-xs leading-relaxed text-muted-foreground">
          Commands once registered: <code className="rounded bg-muted px-1">/status</code>{" "}
          <code className="rounded bg-muted px-1">/queue</code>{" "}
          <code className="rounded bg-muted px-1">/pause</code>{" "}
          <code className="rounded bg-muted px-1">/resume</code>. Only your chat id can use them.
        </p>
      </div>

      {/* Everything still in Vercel, shown so this is one page not two. */}
      <div className="rounded-xl border bg-card p-6">
        <h2 className="text-lg font-semibold">Set in Vercel</h2>
        <p className="mt-0.5 text-sm text-muted-foreground">
          These stay as environment variables. Remember Vercel only exposes them to a{" "}
          <em>new</em> build — adding one without redeploying looks identical to never adding it.
        </p>
        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          <Env label="Resend API key" ok={Boolean(d.environment.resendApiKey)} />
          <Env label="Resend webhook secret" ok={Boolean(d.environment.resendWebhookSecret)} />
          <Env
            label={`Stripe key${d.environment.stripeMode ? ` (${d.environment.stripeMode})` : ""}`}
            ok={Boolean(d.environment.stripeSecretKey)}
          />
          <Env label="Stripe webhook secret" ok={Boolean(d.environment.stripeWebhookSecret)} />
          <Env label="Cron secret" ok={Boolean(d.environment.cronSecret)} />
        </div>
      </div>
    </div>
  );
}

function Env({ label, ok }: { label: string; ok: boolean }) {
  return (
    <div className={`flex items-center gap-2 rounded-lg border px-3 py-2.5 text-sm ${
      ok ? "border-emerald-200 bg-emerald-50" : "border-amber-200 bg-amber-50"}`}>
      {ok ? <Check className="h-4 w-4 text-emerald-700" />
          : <AlertTriangle className="h-4 w-4 text-amber-700" />}
      <span className={ok ? "text-emerald-900" : "text-amber-900"}>{label}</span>
    </div>
  );
}
