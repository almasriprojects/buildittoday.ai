# Telegram agent — setup

Five minutes. Nothing here is code; it is three secrets and one curl.

## 1. Create the bot

Open Telegram, message **@BotFather**, send `/newbot`, and follow the prompts.
It replies with a token like `8123456789:AAH...`. That is `TELEGRAM_BOT_TOKEN`.

## 2. Get your chat id

Message your new bot once — anything, "hello" is fine. It cannot message you
first, so this step is what opens the channel. Then:

```bash
curl -s "https://api.telegram.org/bot<YOUR_TOKEN>/getUpdates" | grep -o '"id":[0-9-]*' | head -1
```

The number is `TELEGRAM_CHAT_ID`.

## 3. Invent a webhook secret

Any random string. This is what proves an incoming command really came from
Telegram:

```bash
python3 -c "import secrets; print(secrets.token_urlsafe(24))"
```

That is `TELEGRAM_WEBHOOK_SECRET`.

## 4. Put all three in Vercel

Project → Settings → Environment Variables → **Production**:

| Name | Value |
|---|---|
| `TELEGRAM_BOT_TOKEN` | from BotFather |
| `TELEGRAM_CHAT_ID` | from step 2 |
| `TELEGRAM_WEBHOOK_SECRET` | from step 3 |

Vercel injects environment variables at build time, so **redeploy after adding
them** — otherwise the running build cannot see them. Any push does it.

## 5. Register the webhook

Once redeployed:

```bash
curl -s "https://api.telegram.org/bot<YOUR_TOKEN>/setWebhook" \
  -d "url=https://www.buildittoday.ai/api/telegram/webhook" \
  -d "secret_token=<YOUR_WEBHOOK_SECRET>"
```

Then message the bot `/status`. If it answers, everything is wired.

## What you will receive

**Every morning at 8am Eastern**, one digest — sent silently so it does not
wake you:

- money first: customers, monthly recurring, setup collected
- pipeline: leads, qualified, reachable, sites approved
- email: sending state, sent yesterday, today's cap, queue depth
- engagement over seven days rather than one noisy day
- what is blocking revenue, in plain words
- a forecast that refuses to invent precision — under twenty sends in a week it
  says so rather than extrapolating a click rate from nothing

**Immediately, with a notification**, only the five things that cannot wait:

| Alert | Why it interrupts |
|---|---|
| 💰 Payment | Someone paid |
| 🚨 Spam complaint | The thing that actually kills a sending domain |
| ⚠️ Bounce | Address suppressed and removed from the sequence |
| 📋 Onboarding submitted | A customer is now waiting on you |
| ❌ Sequencer failed / cap hit | Outreach stopped without anyone asking it to |

Nothing else buzzes. A channel that alerts on everything gets muted, and then
it reports nothing at all.

## Commands

| Command | Does |
|---|---|
| `/status` | Sending state and today's numbers |
| `/queue` | Who is waiting for which email |
| `/pause` | Stop all sending immediately |
| `/resume` | Start again — still refuses without a postal address |

Only the configured chat id can issue these. A leaked webhook URL is not enough
on its own.

## Why this is not in n8n

n8n earns its place when you are wiring many third-party services together and
want to edit the flow visually. This is one integration reading one database we
already own.

Everything else here already runs as pg_cron calling an endpoint. Adding n8n
would mean a second system to host, monitor, secure and pay for, network hops
and stored credentials to reach data an API route queries directly, and the only
component in the stack able to fail on its own — for no capability gained.
