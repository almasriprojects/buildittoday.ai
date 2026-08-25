import { NextRequest, NextResponse } from "next/server";
import { createServerClient, createServiceRoleClient } from "@/lib/supabase";

export const dynamic = "force-dynamic";

/**
 * GET /auth/callback — the far end of a sign-in link.
 *
 * Exchanges the one-time code for a session, then binds the auth user to their
 * customer row. That binding is what row-level security reads, so until it
 * happens a signed-in customer can see nothing at all — including their own
 * account.
 */
export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const token = url.searchParams.get("token_hash");
  const next = url.searchParams.get("next") ?? "/account";

  // Only ever redirect within this site. An open redirect on an auth callback
  // is how a sign-in link gets turned into a phishing link.
  const dest = next.startsWith("/") && !next.startsWith("//") ? next : "/account";
  const fail = (why: string) =>
    NextResponse.redirect(new URL(`/account/login?error=${why}`, request.url));

  const supabase = await createServerClient();

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) return fail("expired");
  } else if (token) {
    const { error } = await supabase.auth.verifyOtp({
      type: "magiclink",
      token_hash: token,
    });
    if (error) return fail("expired");
  } else {
    return fail("missing");
  }

  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.email) return fail("expired");

  // Bind on first sign-in. Matching on email is safe here precisely because
  // clicking the link proved control of that address.
  try {
    const admin = createServiceRoleClient();
    const { data: customer } = await admin
      .from("customers")
      .select("id, auth_user_id")
      .ilike("email", user.email)
      .maybeSingle();

    if (customer && customer.auth_user_id !== user.id) {
      await admin
        .from("customers")
        .update({ auth_user_id: user.id })
        .eq("id", customer.id);
    }
    if (!customer) return fail("noaccount");
  } catch {
    return fail("unknown");
  }

  return NextResponse.redirect(new URL(dest, request.url));
}
