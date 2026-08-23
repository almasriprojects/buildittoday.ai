import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase";
import { requireAdmin } from "@/lib/admin-auth";
import {
  buildVars, deliver, getEmailSettings, isSuppressed, renderTemplate,
  withFooter, type LeadForEmail,
} from "@/lib/email";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

/**
 * POST /api/email/send — send one outreach email.
 *
 * Body: { leadId, templateSlug, test?: boolean }
 *
 * `test: true` sends to the configured reply_to instead of the lead, so the
 * real thing can be checked end to end without contacting a business.
 */
export async function POST(request: NextRequest) {
  const gate = await requireAdmin();
  if (!gate.ok) return gate.response;

  let body: { leadId?: string; templateSlug?: string; test?: boolean };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const { leadId, templateSlug, test = false } = body;
  if (!leadId || !templateSlug) {
    return NextResponse.json({ error: "leadId and templateSlug are required." }, { status: 400 });
  }

  const settings = await getEmailSettings();

  // Two independent guards. A real send needs both an address to satisfy
  // CAN-SPAM and sending explicitly switched on, so nothing can go out by
  // accident while this is still being set up.
  if (!test) {
    if (!settings.sending_enabled) {
      return NextResponse.json(
        { error: "Sending is switched off. Enable it in Email Settings once you're ready." },
        { status: 409 }
      );
    }
    if (!settings.postal_address) {
      return NextResponse.json(
        { error: "A postal address is legally required in commercial email (CAN-SPAM). Add one in Email Settings." },
        { status: 409 }
      );
    }
  }

  const supabase = createServiceRoleClient();

  const [{ data: lead }, { data: template }] = await Promise.all([
    supabase
      .from("leads")
      .select("id, business_name, contact_full_name, contact_email, demo_slug, city")
      .eq("id", leadId)
      .maybeSingle(),
    supabase
      .from("email_templates")
      .select("slug, subject, body_text, sequence_step")
      .eq("slug", templateSlug)
      .maybeSingle(),
  ]);

  if (!lead) return NextResponse.json({ error: "Lead not found" }, { status: 404 });
  if (!template) return NextResponse.json({ error: "Template not found" }, { status: 404 });

  const to = test ? settings.reply_to : lead.contact_email;
  if (!to) return NextResponse.json({ error: "This lead has no email address." }, { status: 400 });

  if (!test) {
    const blocked = await isSuppressed(to, lead.id);
    if (blocked) {
      return NextResponse.json({ error: `Not sent — ${blocked}.` }, { status: 409 });
    }
  }

  // The demo must exist and be approved before anyone is pointed at it.
  if (!test) {
    const { data: site } = await supabase
      .from("demo_sites")
      .select("review_status")
      .eq("demo_slug", lead.demo_slug ?? "")
      .maybeSingle();
    if (site?.review_status !== "approved") {
      return NextResponse.json(
        { error: "This lead's demo hasn't been approved yet." },
        { status: 409 }
      );
    }
  }

  const expiry = new Date();
  expiry.setDate(expiry.getDate() + 3);
  const vars = buildVars(lead as LeadForEmail, settings, {
    expiryDate: expiry.toLocaleDateString("en-US", { month: "long", day: "numeric" }),
  });

  const subject = renderTemplate(template.subject, vars);
  const text = withFooter(renderTemplate(template.body_text, vars), settings, lead.id);

  const result = await deliver({
    settings, intendedTo: to, subject, text, leadId: lead.id,
  });

  if (!result.ok) {
    if (!test) {
      await supabase.from("email_sends").insert({
        lead_id: lead.id, template_slug: template.slug, sequence_step: template.sequence_step,
        to_email: to, intended_to: to, was_test: settings.test_mode,
        subject, error: result.error,
      });
    }
    return NextResponse.json({ error: result.error }, { status: 502 });
  }

  if (test) {
    return NextResponse.json({
      ok: true, test: true, sentTo: result.actualTo,
      subject: result.subject, preview: text,
    });
  }

  const now = new Date().toISOString();
  await supabase.from("email_sends").insert({
    lead_id: lead.id, template_slug: template.slug, sequence_step: template.sequence_step,
    to_email: result.actualTo, intended_to: to, was_test: result.redirected,
    subject: result.subject, provider_id: result.id,
  });
  await supabase.from("leads").update({ outreach_sent_at: now }).eq("id", lead.id);
  await supabase.from("outreach_events").insert({
    lead_id: lead.id, channel: "email", event_type: "sent",
  });

  // Schedule the next touch: 3 days after touch 1, then 5, then 6.
  const gapDays = [3, 5, 6][(template.sequence_step ?? 1) - 1] ?? null;
  const next = gapDays ? new Date(Date.now() + gapDays * 864e5).toISOString() : null;
  await supabase.from("lead_email_state").upsert({
    lead_id: lead.id,
    sequence_step: template.sequence_step ?? 1,
    next_send_at: next,
    status: next ? "active" : "stopped",
    last_event_at: now,
    updated_at: now,
  });

  return NextResponse.json({ ok: true, sentTo: to, subject, providerId: result.id });
}
