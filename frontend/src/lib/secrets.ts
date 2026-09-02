import { createServiceRoleClient } from "@/lib/supabase";

/**
 * Every credential the application uses, resolved in one place.
 *
 * Database first, environment second. Vercel injects environment variables at
 * build time, so a key added there is invisible until the next deploy — a trap
 * this project fell into twice, once with the Resend key and once with its
 * webhook secret, both of which were correct and both of which appeared broken.
 *
 * The environment fallback stays so an existing deployment keeps running and
 * nothing had to be migrated on the day this was introduced.
 */

export type Mode = "test" | "live";

export type Secrets = {
  mode: Mode;
  stripeSecretKey?: string;
  stripeWebhookSecret?: string;
  resendApiKey?: string;
  resendWebhookSecret?: string;
  lobApiKey?: string;
  postcardsEnabled: boolean;
  telegramBotToken?: string;
  telegramChatId?: string;
  telegramWebhookSecret?: string;
};

type Row = Record<string, string | boolean | null>;

/**
 * Cached for a few seconds. Some requests resolve secrets more than once, and
 * a webhook that reads three of them should not make three round trips — but
 * the window stays short so a key changed in the panel takes effect
 * immediately enough to feel instant.
 */
let cache: { at: number; row: Row | null } = { at: 0, row: null };
const TTL_MS = 5_000;

async function readRow(): Promise<Row | null> {
  if (cache.row && Date.now() - cache.at < TTL_MS) return cache.row;
  try {
    const { data } = await createServiceRoleClient()
      .from("app_secrets")
      .select("*")
      .eq("id", 1)
      .maybeSingle();
    cache = { at: Date.now(), row: (data as Row) ?? null };
  } catch {
    // A database blip must never stop a payment being recorded or an alert
    // being sent — fall through to the environment.
    return null;
  }
  return cache.row;
}

/** Forget the cache after a write, so the panel reflects a save immediately. */
export function invalidateSecrets() {
  cache = { at: 0, row: null };
}

export async function getSecrets(): Promise<Secrets> {
  const row = await readRow();
  const s = (k: string) => (typeof row?.[k] === "string" && row[k] ? (row[k] as string) : undefined);

  const envMode: Mode = process.env.STRIPE_SECRET_KEY?.startsWith("sk_live_") ? "live" : "test";
  const mode: Mode = (s("mode") as Mode) ?? envMode;

  // The pair is chosen by mode, so a live key sitting in the database is inert
  // until the mode says otherwise. That is what makes the switch reversible.
  const stripeSecretKey =
    (mode === "live" ? s("stripe_secret_key_live") : s("stripe_secret_key_test")) ??
    process.env.STRIPE_SECRET_KEY;

  const stripeWebhookSecret =
    (mode === "live" ? s("stripe_webhook_secret_live") : s("stripe_webhook_secret_test")) ??
    s("stripe_webhook_secret") ??
    process.env.STRIPE_WEBHOOK_SECRET;

  return {
    mode,
    stripeSecretKey,
    stripeWebhookSecret,
    resendApiKey: s("resend_api_key") ?? process.env.RESEND_API_KEY,
    resendWebhookSecret: s("resend_webhook_secret") ?? process.env.RESEND_WEBHOOK_SECRET,
    lobApiKey: s("lob_api_key") ?? process.env.LOB_API_KEY,
    postcardsEnabled: row?.postcards_enabled === true,
    telegramBotToken: s("telegram_bot_token") ?? process.env.TELEGRAM_BOT_TOKEN,
    telegramChatId: s("telegram_chat_id") ?? process.env.TELEGRAM_CHAT_ID,
    telegramWebhookSecret: s("telegram_webhook_secret") ?? process.env.TELEGRAM_WEBHOOK_SECRET,
  };
}

/**
 * A Stripe client built from the resolved key rather than from the environment
 * at module load, which is what allows the mode to be switched without a
 * deploy. Constructing one per request is cheap — the SDK holds no connection.
 */
export async function stripeClient() {
  const { stripeSecretKey, mode } = await getSecrets();
  if (!stripeSecretKey) throw new Error("No Stripe key configured — set one in Integrations.");
  const Stripe = (await import("stripe")).default;
  return { stripe: new Stripe(stripeSecretKey), mode };
}
