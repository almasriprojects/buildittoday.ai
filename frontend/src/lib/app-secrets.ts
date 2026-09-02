import { createServiceRoleClient } from "@/lib/supabase";

/**
 * Integration secrets, database first and environment second.
 *
 * The database is the editable source — set from /admin/integrations and live
 * the moment it is saved. Vercel injects environment variables at build time,
 * so a key added there is invisible until the next deploy; that gap has already
 * cost this project twice. The env fallback stays so nothing had to be migrated
 * and an existing deployment keeps working.
 */
export async function appSecret(
  column: "stripe_webhook_secret" | "telegram_bot_token" | "telegram_chat_id" | "telegram_webhook_secret",
  envName: string
): Promise<string | undefined> {
  try {
    const { data } = await createServiceRoleClient()
      .from("app_secrets")
      .select(column)
      .eq("id", 1)
      .maybeSingle();
    const v = (data as Record<string, string | null> | null)?.[column];
    if (v) return v;
  } catch {
    // A database blip must not stop a webhook that would otherwise verify.
  }
  return process.env[envName] || undefined;
}
