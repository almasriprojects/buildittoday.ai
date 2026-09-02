import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { createServiceRoleClient } from "@/lib/supabase";
import { requireAdmin } from "@/lib/admin-auth";
import { sendTelegram, telegramCreds } from "@/lib/telegram";

export const dynamic = "force-dynamic";

const SITE = process.env.NEXT_PUBLIC_URL ?? "https://www.buildittoday.ai";

/**
 * Integration credentials, set from the admin panel.
 *
 * Secrets are write-only here. GET reports whether each is configured and shows
 * a masked hint, never the value — so a compromised admin session cannot be
 * used to read the keys back out, and a screenshot of this page leaks nothing.
 */

/** "8123…4821" — enough to tell two keys apart, useless to anyone else. */
function hint(v: string | null): string | null {
  if (!v) return null;
  if (v.length <= 8) return "••••";
  return `${v.slice(0, 4)}…${v.slice(-4)}`;
}

export async function GET() {
  const gate = await requireAdmin();
  if (!gate.ok) return gate.response;

  const supabase = createServiceRoleClient();
  const { data } = await supabase
    .from("app_secrets")
    .select("telegram_bot_token, telegram_chat_id, telegram_webhook_secret, stripe_webhook_secret, updated_at")
    .eq("id", 1)
    .maybeSingle();

  const creds = await telegramCreds();

  return NextResponse.json({
    telegram: {
      botToken: { set: Boolean(data?.telegram_bot_token), hint: hint(data?.telegram_bot_token ?? null) },
      // The chat id is not a secret — it is just a number you own — so it is
      // shown in full. Being able to see it is what makes it checkable.
      chatId: { set: Boolean(data?.telegram_chat_id), value: data?.telegram_chat_id ?? null },
      webhookSecret: { set: Boolean(data?.telegram_webhook_secret), hint: hint(data?.telegram_webhook_secret ?? null) },
      ready: creds.ready,
      fromEnvOnly:
        !data?.telegram_bot_token && Boolean(process.env.TELEGRAM_BOT_TOKEN),
      webhookUrl: `${SITE}/api/telegram/webhook`,
      updatedAt: data?.updated_at ?? null,
    },
    stripe: {
      webhookSecret: {
        set: Boolean(data?.stripe_webhook_secret || process.env.STRIPE_WEBHOOK_SECRET),
        hint: hint(data?.stripe_webhook_secret ?? null),
        inDatabase: Boolean(data?.stripe_webhook_secret),
      },
      mode: process.env.STRIPE_SECRET_KEY?.startsWith("sk_live_") ? "live" : "test",
      webhookUrl: `${SITE}/api/webhooks/stripe`,
    },
    // Read-only status of the secrets that still live in Vercel, so this page
    // is one place to see whether the system is wired rather than two.
    environment: {
      resendApiKey: Boolean(process.env.RESEND_API_KEY),
      resendWebhookSecret: Boolean(process.env.RESEND_WEBHOOK_SECRET),
      stripeSecretKey: Boolean(process.env.STRIPE_SECRET_KEY),
      stripeWebhookSecret: Boolean(process.env.STRIPE_WEBHOOK_SECRET),
      stripeMode: process.env.STRIPE_SECRET_KEY?.startsWith("sk_live_")
        ? "live"
        : process.env.STRIPE_SECRET_KEY
        ? "test"
        : null,
      cronSecret: Boolean(process.env.CRON_SECRET),
    },
  });
}

export async function PATCH(request: NextRequest) {
  const gate = await requireAdmin();
  if (!gate.ok) return gate.response;

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const supabase = createServiceRoleClient();
  const patch: Record<string, string | null> = {};

  const take = (key: string, column: string, validate?: (v: string) => string | null) => {
    if (typeof body[key] !== "string") return null;
    const v = (body[key] as string).trim();
    if (!v) { patch[column] = null; return null; }       // empty clears it
    const bad = validate?.(v);
    if (bad) return bad;
    patch[column] = v;
    return null;
  };

  const errors = [
    take("botToken", "telegram_bot_token", (v) =>
      /^\d{6,}:[A-Za-z0-9_-]{20,}$/.test(v)
        ? null
        : "That doesn't look like a bot token — BotFather gives you something like 8123456789:AAH…"),
    take("chatId", "telegram_chat_id", (v) =>
      /^-?\d{5,}$/.test(v) ? null : "A chat id is a number, sometimes negative for groups."),
    take("webhookSecret", "telegram_webhook_secret", (v) =>
      v.length >= 16 ? null : "Use at least 16 characters, or press Generate."),
    take("stripeWebhookSecret", "stripe_webhook_secret", (v) =>
      v.startsWith("whsec_") ? null : "A Stripe signing secret starts with whsec_"),
  ].filter(Boolean);

  if (errors.length) return NextResponse.json({ error: errors[0] }, { status: 400 });
  if (!Object.keys(patch).length) return NextResponse.json({ ok: true, changed: false });

  const { error } = await supabase.from("app_secrets").update(patch).eq("id", 1);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true, changed: true });
}

export async function POST(request: NextRequest) {
  const gate = await requireAdmin();
  if (!gate.ok) return gate.response;

  let action = "";
  try {
    action = String((await request.json()).action ?? "");
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const supabase = createServiceRoleClient();

  // The webhook secret is not obtained from anywhere — it is an arbitrary
  // string you invent, which is exactly the sort of instruction that stops
  // someone mid-setup. So the panel makes one.
  if (action === "generate_webhook_secret") {
    const secret = crypto.randomBytes(24).toString("base64url");
    const { error } = await supabase
      .from("app_secrets").update({ telegram_webhook_secret: secret }).eq("id", 1);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true, generated: true });
  }

  if (action === "register_webhook") {
    const { token, webhookSecret } = await telegramCreds();
    if (!token) return NextResponse.json({ error: "Add the bot token first." }, { status: 400 });
    if (!webhookSecret) {
      return NextResponse.json({ error: "Generate a webhook secret first." }, { status: 400 });
    }

    const res = await fetch(`https://api.telegram.org/bot${token}/setWebhook`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        url: `${SITE}/api/telegram/webhook`,
        secret_token: webhookSecret,
        allowed_updates: ["message"],
      }),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok || json?.ok === false) {
      return NextResponse.json(
        { error: json?.description ?? `Telegram ${res.status}` },
        { status: 502 }
      );
    }
    return NextResponse.json({ ok: true, registered: true });
  }

  // Finding the chat id is the other step people get stuck on. If the bot has
  // been messaged, it can be read straight off getUpdates.
  if (action === "detect_chat_id") {
    const { token } = await telegramCreds();
    if (!token) return NextResponse.json({ error: "Add the bot token first." }, { status: 400 });

    const res = await fetch(`https://api.telegram.org/bot${token}/getUpdates?limit=10`);
    const json = await res.json().catch(() => ({}));
    const updates: Array<{ message?: { chat?: { id?: number } } }> = json?.result ?? [];
    const id = updates.map((u) => u.message?.chat?.id).filter(Boolean).pop();

    if (!id) {
      return NextResponse.json(
        { error: "No messages found. Open Telegram, send your bot any message, then press this again." },
        { status: 404 }
      );
    }
    const { error } = await supabase
      .from("app_secrets").update({ telegram_chat_id: String(id) }).eq("id", 1);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true, chatId: String(id) });
  }

  if (action === "register_stripe_webhook") {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) return NextResponse.json({ error: "No Stripe key configured." }, { status: 400 });

    const events = [
      "checkout.session.completed",
      "customer.subscription.updated",
      "customer.subscription.deleted",
      "invoice.payment_failed",
    ];

    // Reuse an endpoint already pointing here rather than stacking duplicates,
    // which would deliver every event twice.
    const list = await fetch("https://api.stripe.com/v1/webhook_endpoints?limit=100", {
      headers: { Authorization: `Bearer ${key}` },
    }).then((r) => r.json());
    const url = `${SITE}/api/webhooks/stripe`;
    const existing = (list?.data ?? []).find((e: { url: string }) => e.url === url);

    const params = new URLSearchParams();
    if (!existing) params.set("url", url);
    events.forEach((e, i) => params.set(`enabled_events[${i}]`, e));

    const res = await fetch(
      existing
        ? `https://api.stripe.com/v1/webhook_endpoints/${existing.id}`
        : "https://api.stripe.com/v1/webhook_endpoints",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${key}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: params.toString(),
      }
    );
    const json = await res.json();
    if (json?.error) {
      return NextResponse.json({ error: json.error.message }, { status: 502 });
    }

    // Stripe returns the signing secret only when the endpoint is created, so
    // it is captured here rather than asked for.
    if (json.secret) {
      await supabase.from("app_secrets")
        .update({ stripe_webhook_secret: json.secret }).eq("id", 1);
    }

    return NextResponse.json({
      ok: true,
      endpointId: json.id,
      reused: Boolean(existing),
      secretCaptured: Boolean(json.secret),
      note: json.secret
        ? undefined
        : "Endpoint already existed, so Stripe did not return its secret. Reveal it in the Stripe dashboard and paste it below.",
    });
  }

  if (action === "test_message") {
    const res = await sendTelegram(
      "✅ <b>Connected.</b>\nThis is BuildItToday. You'll get a digest each morning and an alert when something needs you."
    );
    return res.ok
      ? NextResponse.json({ ok: true, sent: true })
      : NextResponse.json({ error: res.error }, { status: 502 });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
