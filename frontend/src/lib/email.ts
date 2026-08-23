import { createServiceRoleClient } from "@/lib/supabase";

export type EmailSettings = {
  from_name: string;
  from_email: string;
  reply_to: string;
  postal_address: string | null;
  daily_cap: number;
  sending_enabled: boolean;
  test_mode: boolean;
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
    from_email: "contact@buildittoday.ai",
    reply_to: "contact@buildittoday.ai",
    postal_address: null,
    daily_cap: 10,
    sending_enabled: false,
    // If settings cannot be read, assume the most cautious posture rather than
    // the most permissive one.
    test_mode: true,
  };
}

/**
 * Words that mark a string as an organisation rather than a person. Position is
 * irrelevant, which is the whole point: "Salcone Family Trust The" reads as a
 * person until you get past the first word. Checking only the leading token
 * sends "Hi Salcone" to a trust.
 */
const ENTITY_WORDS = new Set([
  "the", "trust", "trustee", "trustees", "family", "revocable", "irrevocable",
  "living", "estate", "heirs", "llc", "llp", "lp", "pllc", "pa", "inc",
  "incorporated", "corp", "corporation", "co", "company", "holdings",
  "holding", "properties", "property", "realty", "homes", "group", "groups",
  "enterprise", "enterprises", "ventures", "partners", "partnership",
  "associates", "association", "management", "investment", "investments",
  "investors", "capital", "services", "solutions", "and", "&", "of", "bank",
  "na", "borrower", "limited", "liability", "delaware", "dept", "department",
  "tax", "invitation", "acquisitions", "ventures",
]);

/**
 * Tokens that are never a first name, though some are fine further along
 * ("John Smith Jr" is a person; "Jr Smith" is parsed junk).
 */
const NOT_A_FIRST_NAME = new Set([
  "mr", "mrs", "ms", "miss", "dr", "prof", "rev", "sir",
  "jr", "sr", "ii", "iii", "iv", "md", "dds", "esq", "phd",
]);

/**
 * Only the first name, and only when it plausibly belongs to a real person.
 *
 * Roughly two thirds of skip-traced contacts are a different person from the
 * registered owner, or an entity rather than a person at all. Greeting a
 * stranger by the wrong name is worse than not greeting them — so anything
 * short of confident degrades to no salutation instead of guessing.
 */
export function firstNameOf(lead: LeadForEmail): string | null {
  const raw = (lead.contact_full_name ?? "").trim();
  if (!raw) return null;

  const tokens = raw.split(/\s+/).map((t) => t.replace(/[.,]/g, "")).filter(Boolean);
  // People have one to four name parts. Longer strings are entities.
  if (tokens.length === 0 || tokens.length > 4) return null;

  // A single entity word anywhere disqualifies the entire string.
  if (tokens.some((t) => ENTITY_WORDS.has(t.toLowerCase()))) return null;

  const first = tokens[0];
  if (first.length < 2 || first.length > 20) return null;
  // Letters, apostrophes and hyphens only — rejects "770" and other parse junk.
  // Case is not a signal: skip-trace data arrives shouting, and "JOHN" is a
  // perfectly good name once it is normalised.
  if (!/^[A-Za-z][A-Za-z'’-]*$/.test(first)) return null;
  if (NOT_A_FIRST_NAME.has(first.toLowerCase())) return null;

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

export type DeliveryResult =
  | { ok: true; id: string; actualTo: string; subject: string; redirected: boolean }
  | { ok: false; error: string };

/**
 * The only way mail leaves this system.
 *
 * Every route and job goes through here rather than calling sendEmail directly,
 * because test mode has to be impossible to forget. A check that each caller
 * must remember to make is a check that will eventually be skipped by the one
 * caller written in a hurry — so the redirect lives at the single point all
 * sending funnels through, not in the callers.
 *
 * While test_mode is on, every message goes to the operator's own inbox with
 * the intended recipient shown in the subject. Nothing else changes: the
 * sequence advances, tracking fires, state moves. The rehearsal is real in
 * every respect except who receives it.
 */
export async function deliver(args: {
  settings: EmailSettings;
  intendedTo: string;
  subject: string;
  text: string;
  leadId: string;
}): Promise<DeliveryResult> {
  const { settings } = args;
  const redirected = settings.test_mode;
  const to = redirected ? settings.reply_to : args.intendedTo;
  const subject = redirected
    ? `[TEST → ${args.intendedTo}] ${args.subject}`
    : args.subject;

  const res = await sendEmail({
    to, subject, text: args.text,
    from: `${settings.from_name} <${settings.from_email}>`,
    replyTo: settings.reply_to,
    leadId: args.leadId,
  });

  if (!res.ok) return res;
  return { ok: true, id: res.id, actualTo: to, subject, redirected };
}

async function sendEmail(args: {
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
