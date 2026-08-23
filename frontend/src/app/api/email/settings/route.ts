import { NextRequest, NextResponse } from "next/server";
import { createServerClient, createServiceRoleClient } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export async function GET() {
  const authed = await createServerClient();
  const { data: { user } } = await authed.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const supabase = createServiceRoleClient();
  const [{ data: settings }, { data: templates }, { count: sentToday }] = await Promise.all([
    supabase.from("email_settings").select("*").eq("id", 1).maybeSingle(),
    supabase
      .from("email_templates")
      .select("slug, name, subject, body_text, description, sequence_step, active")
      .order("sequence_step", { nullsFirst: false }),
    supabase
      .from("email_sends")
      .select("*", { count: "exact", head: true })
      .gte("sent_at", new Date(new Date().toDateString()).toISOString())
      .is("error", null),
  ]);

  return NextResponse.json({
    settings,
    templates: templates ?? [],
    sentToday: sentToday ?? 0,
    resendConfigured: Boolean(process.env.RESEND_API_KEY),
  });
}

export async function PATCH(request: NextRequest) {
  const authed = await createServerClient();
  const { data: { user } } = await authed.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  for (const f of ["from_name", "from_email", "reply_to", "postal_address"] as const) {
    if (typeof body[f] === "string") patch[f] = (body[f] as string).trim() || null;
  }
  if (typeof body.daily_cap === "number" && body.daily_cap > 0 && body.daily_cap <= 500) {
    patch.daily_cap = Math.floor(body.daily_cap);
  }

  if (typeof body.sending_enabled === "boolean") {
    // Turning sending on without a postal address would put every subsequent
    // email in breach of CAN-SPAM, so the switch itself refuses.
    if (body.sending_enabled) {
      const supabase = createServiceRoleClient();
      const { data: cur } = await supabase
        .from("email_settings").select("postal_address").eq("id", 1).maybeSingle();
      const address = (patch.postal_address as string | null) ?? cur?.postal_address;
      if (!address) {
        return NextResponse.json(
          { error: "Add a postal address first — it's legally required in every commercial email." },
          { status: 400 }
        );
      }
    }
    patch.sending_enabled = body.sending_enabled;
  }

  const supabase = createServiceRoleClient();
  const { data, error } = await supabase
    .from("email_settings").update(patch).eq("id", 1).select("*").maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, settings: data });
}
