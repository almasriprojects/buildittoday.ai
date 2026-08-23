import { createServiceRoleClient } from "@/lib/supabase";

export type EmailSettings = {
  from_name: string;
  from_email: string;
  reply_to: string;
  postal_address: string | null;
  daily_cap: number;
  sending_enabled: boolean;
};

export type LeadForEmail = {
  id: string;
  business_name: string;
  contact_full_name: string | null;
  contact_email: string | null;
  demo_slug: string | null;
  city: string | null;
};

const SITE_URL = process.env.NEXT_PUBLIC_URL ?? "https://www.buildittoday.ai";

export async function getEmailSettings(): Promise<EmailSettings> {
  const supabase = createServiceRoleClient();
  const { data } = await supabase.from("email_settings").select("*").eq("id", 1).maybeSingle();
  return (data as EmailSettings) ?? {
    from_name: "BuildItToday.ai",
    from_email: "hello@buildittoday.ai",
    reply_to: "contact@buildittoday.ai",
    postal_address: null,
    daily_cap: 10,
    sending_enabled: false,
  };
}

/**
 * Only the first name, and only when it plausibly belongs to the owner.
 *
 * Skip-traced contacts are frequently a different person from the registered
 * owner, and greeting a stranger by the wrong name is worse than not greeting
 * them at all — so anything that doesn't look like a personal first name
 * degrades to no salutation rather than guessing.
 */
export function firstNameOf(lead: LeadForEmail): string | null {
  const raw = (lead.contact_full_name ?? "").trim();
  if (!raw) return null;
  const first = raw.split(/\s+/)[0];
  if (!first || first.length < 2 || first.length > 20) return null;
  if (!/^[A-Za-z][a-z'-]+$/.test(first)) return null; // rejects "770", "LLC", "THE"
  const notNames = new Set(["the", "trust", "family", "llc", "inc", "corp", "company"]);
  if (notNames.has(first.toLowerCase())) return null;
  return first.charAt(0).toUpperCase() + first.slice(1).toLowerCase();
}

export function renderTemplate(
  body: string,
  vars: Record<string, string | null | undefined>
): string {
  return body.replace(/\{\{(\w+)\}\}/g, (_m, key: string) => vars[key] ?? "");
}

export function buildVars(
  lead: LeadForEmail,
  settings: EmailSettings,
  opts: { expiryDate?: string } = {}
) {
  const first = firstNameOf(lead);
  return {
    business_name: lead.business_name,
    first_name: first ?? "",
    // " Sarah," or "" — lets one template read naturally either way
    first_name_comma: first ? ` ${first},` : ",",
    city: lead.city ?? "",
    demo_url: `${SITE_URL}/api/track/click?lead=${lead.id}&src=email`,
    from_name: settings.from_name,
    reply_to: settings.reply_to,
    expiry_date: opts.expiryDate ?? "",
  };
}

/** Plain-text email with the legally required footer appended. */
export function withFooter(body: string, settings: EmailSettings, leadId: string): string {
  const unsub = `${SITE_URL}/api/email/unsubscribe?lead=${leadId}`;
  return `${body.trim()}

—
${settings.from_name}
${settings.postal_address ?? ""}

Don't want these emails? Unsubscribe: ${unsub}`;
}

export async function sendEmail(args: {
  to: string;
  subject: string;
  text: string;
  from: string;
  replyTo: string;
  leadId: string;
}): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  const key = process.env.RESEND_API_KEY;
  if (!key) return { ok: false, error: "RESEND_API_KEY is not configured" };

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: args.from,
      to: [args.to],
      subject: args.subject,
      text: args.text,
      reply_to: args.replyTo,
      // Lets a recipient's client unsubscribe in one click, which materially
      // reduces spam complaints — the thing that kills a sending domain.
      headers: {
        "List-Unsubscribe": `<${SITE_URL}/api/email/unsubscribe?lead=${args.leadId}>`,
        "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
      },
    }),
  });

  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    return { ok: false, error: body?.message ?? `Resend ${res.status}` };
  }
  return { ok: true, id: body.id };
}

/** Never send to a suppressed, bounced or unsubscribed address. */
export async function isSuppressed(email: string, leadId: string): Promise<string | null> {
  const supabase = createServiceRoleClient();
  const [{ data: sup }, { data: lead }] = await Promise.all([
    supabase.from("email_suppressions").select("reason").eq("email", email.toLowerCase()).maybeSingle(),
    supabase.from("leads").select("unsubscribed_at, email_bounced_at").eq("id", leadId).maybeSingle(),
  ]);
  if (sup) return sup.reason;
  if (lead?.unsubscribed_at) return "unsubscribed";
  if (lead?.email_bounced_at) return "previously bounced";
  return null;
}
