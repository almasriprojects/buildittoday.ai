import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase";
import { sendTransactional } from "@/lib/email";

export const dynamic = "force-dynamic";

const SITE = process.env.NEXT_PUBLIC_URL ?? "https://www.buildittoday.ai";

/**
 * POST /api/account/login — send a sign-in link to a customer.
 *
 * No passwords. A small business owner visits this four times a year and will
 * not remember one; every reset would be a support email. A link in their
 * inbox is also proof they control the address, which is the only thing a
 * password was establishing anyway.
 *
 * The link is generated here and sent through Resend rather than Supabase's
 * built-in mail, so it comes from the domain already warmed for outreach and
 * looks like the rest of the business.
 */
export async function POST(request: NextRequest) {
  let email = "";
  try {
    const body = await request.json();
    email = String(body.email ?? "").trim().toLowerCase();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  if (!email || !email.includes("@") || email.length > 254) {
    return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
  }

  // The same answer either way. Telling a stranger whether an address belongs
  // to a customer leaks your customer list one guess at a time.
  const generic = NextResponse.json({
    ok: true,
    message: "If that address is on file, a sign-in link is on its way.",
  });

  try {
    const supabase = createServiceRoleClient();

    const { data: customer } = await supabase
      .from("customers")
      .select("id, business_name")
      .ilike("email", email)
      .maybeSingle();

    if (!customer) return generic;

    const { data, error } = await supabase.auth.admin.generateLink({
      type: "magiclink",
      email,
      options: { redirectTo: `${SITE}/auth/callback?next=/account` },
    });

    if (error || !data?.properties?.action_link) return generic;

    const link = data.properties.action_link;
    const name = customer.business_name;

    await sendTransactional({
      to: email,
      subject: "Your sign-in link",
      text: `Hi,

Here's your link to sign in to the ${name} account:

${link}

It works once and expires in an hour. If you didn't ask for it, you can ignore
this — nothing has changed on your account.

BuildItToday.ai
contact@buildittoday.ai
(305) 505-0153`,
    });

    return generic;
  } catch {
    // Never reveal that something went wrong internally — same answer always.
    return generic;
  }
}
