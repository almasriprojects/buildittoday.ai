import { NextRequest, NextResponse } from "next/server";
import { createServerClient, createServiceRoleClient } from "@/lib/supabase";
import { sendTransactional } from "@/lib/email";

export const dynamic = "force-dynamic";

/**
 * POST /api/account/onboarding — the customer tells us where the site should
 * live and what to change.
 *
 * Writes through the service role after checking the session, so a customer can
 * only ever update the row bound to their own auth user. The fields are
 * whitelisted: a customer sets their domain and contact details, never their
 * tier, their price, or what they have paid.
 */
export async function POST(request: NextRequest) {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const str = (v: unknown, max = 200) =>
    typeof v === "string" ? v.trim().slice(0, max) : "";

  const needsDomain = body.needsDomain === true;
  const domain = str(body.domain, 120)
    .replace(/^https?:\/\//i, "")
    .replace(/\/.*$/, "")
    .toLowerCase();

  if (!needsDomain && !domain) {
    return NextResponse.json(
      { error: "Give us a domain, or tick the box saying you need help choosing one." },
      { status: 400 }
    );
  }
  if (domain && !/^[a-z0-9][a-z0-9.-]*\.[a-z]{2,}$/.test(domain)) {
    return NextResponse.json(
      { error: "That doesn't look like a domain. Try something like yourbusiness.com" },
      { status: 400 }
    );
  }

  const admin = createServiceRoleClient();
  const { data: customer } = await admin
    .from("customers")
    .select("id, business_name, email")
    .eq("auth_user_id", user.id)
    .maybeSingle();

  if (!customer) return NextResponse.json({ error: "No account found" }, { status: 404 });

  const notes = str(body.notes, 4000);

  const { error } = await admin
    .from("customers")
    .update({
      domain: domain || null,
      domain_status: needsDomain ? "not_provided" : "provided",
      phone: str(body.phone, 40) || null,
      address_street: str(body.addressStreet) || null,
      address_city: str(body.addressCity, 80) || null,
      address_zip: str(body.addressZip, 20) || null,
      // Moves them out of the queue that is waiting on them and into yours.
      onboarding_state: "in_build",
    })
    .eq("id", customer.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  if (notes) {
    await admin.from("customer_notes").insert({
      customer_id: customer.id,
      author: "customer",
      body: notes,
    });
  }

  // Tell the operator there is work to do. Without this the queue only updates
  // when someone remembers to look at it.
  await sendTransactional({
    to: "contact@buildittoday.ai",
    subject: `Onboarding submitted — ${customer.business_name}`,
    text: `${customer.business_name} has sent their details.

Domain : ${needsDomain ? "NEEDS HELP CHOOSING ONE" : domain}
Phone  : ${str(body.phone, 40) || "—"}
Address: ${[str(body.addressStreet), str(body.addressCity, 80), str(body.addressZip, 20)]
      .filter(Boolean)
      .join(", ") || "—"}

Changes they asked for:
${notes || "(none)"}

Admin: https://www.buildittoday.ai/admin/customers`,
  }).catch(() => {});

  return NextResponse.json({ ok: true });
}
