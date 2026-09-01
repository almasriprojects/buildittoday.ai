import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase";
import { sendTelegram } from "@/lib/telegram";
import { getEmailSettings } from "@/lib/email";

export const dynamic = "force-dynamic";

/**
 * POST /api/telegram/webhook — commands from the bot.
 *
 * The important one is /pause. Being able to stop all outreach from a phone,
 * without finding a laptop and signing in, is the difference between noticing
 * a problem at dinner and it running all evening.
 *
 * Two locks on who may drive this. Telegram signs its calls with a secret token
 * header set when the webhook is registered, and every command is additionally
 * checked against TELEGRAM_CHAT_ID — so even a leaked webhook URL cannot be
 * used by a stranger to switch off your business.
 */

type Update = {
  message?: { text?: string; chat?: { id: number | string } };
};

export async function POST(request: NextRequest) {
  const expected = process.env.TELEGRAM_WEBHOOK_SECRET;
  const presented = request.headers.get("x-telegram-bot-api-secret-token");
  if (!expected || presented !== expected) {
    // 200 rather than 401: Telegram retries on errors, and a wrong caller
    // should be quietly ignored rather than told it guessed wrong.
    return NextResponse.json({ ok: true });
  }

  let update: Update;
  try {
    update = await request.json();
  } catch {
    return NextResponse.json({ ok: true });
  }

  const chatId = String(update.message?.chat?.id ?? "");
  const text = (update.message?.text ?? "").trim().toLowerCase();
  if (!text.startsWith("/")) return NextResponse.json({ ok: true });

  // Only the configured owner may issue commands.
  if (!process.env.TELEGRAM_CHAT_ID || chatId !== String(process.env.TELEGRAM_CHAT_ID)) {
    return NextResponse.json({ ok: true });
  }

  const supabase = createServiceRoleClient();
  const cmd = text.split(/\s+/)[0].replace(/@.*$/, "");

  try {
    if (cmd === "/pause") {
      await supabase
        .from("email_settings")
        .update({ sending_enabled: false, updated_at: new Date().toISOString() })
        .eq("id", 1);
      await sendTelegram("⏸ <b>Sending paused.</b>\nNothing further will go out. Send /resume to start again.");
      return NextResponse.json({ ok: true });
    }

    if (cmd === "/resume") {
      const settings = await getEmailSettings();
      // The same guard the admin panel applies. A phone command must not be a
      // way around a legal requirement.
      if (!settings.postal_address) {
        await sendTelegram("❌ Can't resume — there is still no postal address on file, which commercial email legally requires.");
        return NextResponse.json({ ok: true });
      }
      await supabase
        .from("email_settings")
        .update({ sending_enabled: true, updated_at: new Date().toISOString() })
        .eq("id", 1);
      await sendTelegram(
        settings.test_mode
          ? "▶️ <b>Sending resumed</b> — still in test mode, so everything redirects to you."
          : "▶️ <b>Sending resumed.</b> Real businesses will now receive email."
      );
      return NextResponse.json({ ok: true });
    }

    if (cmd === "/status" || cmd === "/today") {
      const settings = await getEmailSettings();
      const midnight = new Date(new Date().toDateString()).toISOString();
      const [{ count: sentToday }, { count: approved }, { count: customers }] = await Promise.all([
        supabase.from("email_sends").select("*", { count: "exact", head: true })
          .gte("sent_at", midnight).is("error", null),
        supabase.from("demo_sites").select("*", { count: "exact", head: true })
          .eq("review_status", "approved"),
        supabase.from("customers").select("*", { count: "exact", head: true }),
      ]);

      const state = !settings.sending_enabled
        ? "⏸ paused"
        : settings.test_mode
        ? "🧪 test mode"
        : "✅ live";

      await sendTelegram(
        [
          `<b>Status</b>`,
          `  Sending: ${state}`,
          `  Today: ${sentToday ?? 0}/${settings.daily_cap} sent`,
          `  ${approved ?? 0} sites approved · ${customers ?? 0} customers`,
        ].join("\n")
      );
      return NextResponse.json({ ok: true });
    }

    if (cmd === "/queue") {
      const { data } = await supabase
        .from("lead_email_state")
        .select("next_send_at, status, sequence_step")
        .in("status", ["active", "clicked"]);
      const rows = data ?? [];
      const now = new Date().toISOString();
      const due = rows.filter((r) => r.next_send_at && r.next_send_at <= now).length;
      const byStep: Record<number, number> = {};
      for (const r of rows) byStep[r.sequence_step + 1] = (byStep[r.sequence_step + 1] ?? 0) + 1;

      await sendTelegram(
        [
          `<b>Queue</b>`,
          `  ${rows.length} in sequence · ${due} due now`,
          ...Object.entries(byStep).map(([s, n]) => `  ${n} waiting for touch ${s}`),
        ].join("\n")
      );
      return NextResponse.json({ ok: true });
    }

    await sendTelegram(
      [
        "<b>Commands</b>",
        "  /status — sending state and today's numbers",
        "  /queue — who is waiting for which email",
        "  /pause — stop all sending immediately",
        "  /resume — start again",
      ].join("\n")
    );
  } catch {
    // Never surface an internal failure into the chat.
    await sendTelegram("Something went wrong running that. Check the admin panel.").catch(() => {});
  }

  return NextResponse.json({ ok: true });
}
