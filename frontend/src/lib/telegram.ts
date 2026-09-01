/**
 * Telegram, as the place the business reports to you.
 *
 * Built as a plain module called by a cron'd API route, the same way every
 * other scheduled job here works. n8n was considered and rejected: it earns its
 * place when you are wiring many third-party services together and want to edit
 * the flow visually, but this is one integration reading one database you
 * already own. Adding it would mean a second system to host, monitor, secure
 * and pay for — and the only part of the stack that could fail on its own.
 */

const API = "https://api.telegram.org";

function creds() {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  return { token, chatId, ready: Boolean(token && chatId) };
}

export function telegramConfigured(): boolean {
  return creds().ready;
}

/**
 * Telegram's MarkdownV2 escapes an awkward set of characters, and an unescaped
 * one makes the whole message fail rather than render oddly. Plain text with
 * HTML parse mode is far more forgiving for machine-built messages.
 */
function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export async function sendTelegram(
  text: string,
  opts: { silent?: boolean } = {}
): Promise<{ ok: true } | { ok: false; error: string }> {
  const { token, chatId, ready } = creds();
  if (!ready) return { ok: false, error: "TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID not set" };

  try {
    const res = await fetch(`${API}/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: "HTML",
        disable_web_page_preview: true,
        // Alerts should buzz; the morning digest should not wake anyone.
        disable_notification: opts.silent ?? false,
      }),
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok || body?.ok === false) {
      return { ok: false, error: body?.description ?? `Telegram ${res.status}` };
    }
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "send failed" };
  }
}

/**
 * An alert worth interrupting someone for. Deliberately a short list: a channel
 * that buzzes for everything gets muted, and then it reports nothing at all.
 */
export type AlertKind =
  | "payment"
  | "bounce"
  | "complaint"
  | "onboarding"
  | "sequencer_failed"
  | "cap_reached";

const ALERT_ICON: Record<AlertKind, string> = {
  payment: "💰",
  bounce: "⚠️",
  complaint: "🚨",
  onboarding: "📋",
  sequencer_failed: "❌",
  cap_reached: "⏸",
};

export async function alert(kind: AlertKind, title: string, detail?: string) {
  const lines = [`${ALERT_ICON[kind]} <b>${esc(title)}</b>`];
  if (detail) lines.push(esc(detail));
  return sendTelegram(lines.join("\n"));
}

/** Formats a plain, readable digest. Numbers first; prose only where it helps. */
export function formatDigest(d: {
  date: string;
  leads: { total: number; newToday: number; qualified: number; reachable: number };
  sites: { built: number; approved: number; pendingReview: number };
  email: {
    sentYesterday: number;
    sentToday: number;
    dueNow: number;
    dailyCap: number;
    sendingOn: boolean;
    testMode: boolean;
  };
  funnel: { clicks: number; views: number; offersShown: number; offersClicked: number };
  money: { customers: number; mrrCents: number; setupCents: number };
  waiting: { onYou: number; neverContacted: number };
  blockers: string[];
  forecast: string;
}): string {
  const money = (c: number) => `$${(c / 100).toLocaleString("en-US")}`;
  const L: string[] = [];

  L.push(`<b>BuildItToday — ${esc(d.date)}</b>`);
  L.push("");

  // The number that matters most, first.
  if (d.money.customers > 0) {
    L.push(`💰 <b>${d.money.customers} customer${d.money.customers > 1 ? "s" : ""}</b> · ${money(d.money.mrrCents)}/mo · ${money(d.money.setupCents)} collected`);
  } else {
    L.push(`💰 No customers yet`);
  }
  L.push("");

  L.push(`<b>Pipeline</b>`);
  L.push(`  ${d.leads.total.toLocaleString()} leads (+${d.leads.newToday} today)`);
  L.push(`  ${d.leads.qualified.toLocaleString()} qualified · ${d.leads.reachable.toLocaleString()} reachable`);
  L.push(`  ${d.sites.built} sites · ${d.sites.approved} approved · ${d.sites.pendingReview} awaiting review`);
  L.push("");

  L.push(`<b>Email</b>`);
  if (!d.email.sendingOn) {
    L.push(`  ⏸ Sending is OFF`);
  } else if (d.email.testMode) {
    L.push(`  🧪 TEST MODE — everything redirects to you`);
  } else {
    L.push(`  ✅ Live`);
  }
  L.push(`  ${d.email.sentYesterday} sent yesterday · ${d.email.sentToday}/${d.email.dailyCap} today`);
  L.push(`  ${d.email.dueNow} due in the queue`);
  L.push("");

  L.push(`<b>Engagement</b>`);
  L.push(`  ${d.funnel.clicks} clicks · ${d.funnel.views} site views`);
  L.push(`  ${d.funnel.offersShown} offers seen · ${d.funnel.offersClicked} package clicks`);
  L.push("");

  L.push(`<b>Today</b>`);
  L.push(`  ${esc(d.forecast)}`);

  if (d.waiting.onYou > 0 || d.waiting.neverContacted > 0) {
    L.push("");
    L.push(`<b>Needs you</b>`);
    if (d.waiting.onYou) L.push(`  ${d.waiting.onYou} customer${d.waiting.onYou > 1 ? "s" : ""} waiting on you to build or launch`);
    if (d.waiting.neverContacted) L.push(`  ⚠️ ${d.waiting.neverContacted} paid but never received a welcome email`);
  }

  if (d.blockers.length) {
    L.push("");
    L.push(`<b>Blocked</b>`);
    for (const b of d.blockers) L.push(`  • ${esc(b)}`);
  }

  return L.join("\n");
}
