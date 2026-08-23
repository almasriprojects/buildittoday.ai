import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";

/**
 * Who is allowed into the admin console.
 *
 * Being signed in is not the same as being staff. Supabase Auth will happily
 * mint an account for anyone who asks, so "a user exists" was never a
 * meaningful gate — it granted whoever registered full access to every lead
 * record, the outreach controls, and customer data.
 *
 * The allowlist lives in the environment rather than the database so that
 * write access to Postgres is not by itself enough to grant yourself the
 * console.
 */
const FALLBACK_ADMIN = "admin@ananalmasri.com";

export function adminEmails(): string[] {
  const raw = process.env.ADMIN_EMAILS ?? FALLBACK_ADMIN;
  return raw
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

export function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  return adminEmails().includes(email.trim().toLowerCase());
}

/**
 * Returns the signed-in admin, or a response to send back.
 *
 * Deliberately answers 404 rather than 403 to a signed-in non-admin: telling
 * someone their account is real but insufficient invites them to keep trying.
 */
export async function requireAdmin(): Promise<
  { ok: true; email: string } | { ok: false; response: NextResponse }
> {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Not authenticated" }, { status: 401 }),
    };
  }

  if (!isAdminEmail(user.email)) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Not found" }, { status: 404 }),
    };
  }

  return { ok: true, email: user.email! };
}
