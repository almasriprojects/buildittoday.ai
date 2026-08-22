# Email Marketing — Sequence Logic

**Status:** THINKING DOCUMENT. Nothing built. Read, argue with it, then we design the build.

---

## 1. Three things to decide before any template is written

### 1a. CAN-SPAM is law, not a nicety

Commercial email to US recipients legally requires:

1. Accurate From/Reply-To headers
2. A subject line that isn't deceptive
3. **A valid physical postal address in every email**
4. A clear, working unsubscribe
5. Opt-outs honoured within 10 business days

Penalties run to five figures **per email**. #3 is the one people miss — you need a real mailing
address in the footer of every send. A PO box is fine.

**Decision needed:** what postal address goes in the footer?

### 1b. Open tracking is largely broken now

Since iOS 15, Apple Mail pre-fetches images — including tracking pixels — for privacy. Roughly
half of all opens are Apple Mail, so:

- "Opened" is inflated and unreliable
- **Clicks are the only trustworthy engagement signal**
- Branching a sequence on "opened but didn't click" will misfire constantly

We should still record opens (they're directionally useful in aggregate), but **the sequence
must branch on clicks, not opens.** This is the single most important design constraint.

### 1c. Your storage worry has a better answer than deleting

Measured, per lead: **4.3 MB** — of which **3.9 MB is PNG scene images** (90%).

| Leads | Storage |
|---|---|
| 43 today | 180 MB |
| 500 | ~2 GB |
| 4,924 qualified | **~21 GB** |

Supabase Pro includes 100 GB. **21 GB is not a problem.** But:

**Converting those PNGs to WebP cuts ~85-90% — roughly 21 GB → 3 GB — and makes every demo
load faster for the lead.** That's strictly better than deletion: it solves storage *and*
improves the thing you're selling. Deletion should be about honest scarcity, not disk space.

---

## 2. The sequence

### Entry condition

A lead enters only when **all** are true:
- `demo_sites.review_status = 'approved'` (a human cleared it)
- `contact_email IS NOT NULL`
- `found_on_maps IS NOT TRUE` (they don't already have a site)
- `outreach_sent_at IS NULL`
- not unsubscribed, not bounced

### The touches

| # | Day | Trigger | Angle |
|---|---|---|---|
| **1** | 0 | Entry | "We built a website for {business}. Here it is." |
| **2** | +3 | No click yet | Different subject, same link — assume touch 1 was never seen |
| **3** | +8 | No click yet | Handle the obvious objection: *is this real? what's the catch?* |
| **3b** | +8 | **Clicked, didn't claim** | Different email entirely — they're interested. Ask what's stopping them. |
| **4** | +14 | Still no claim | Expiry notice — the preview comes down |
| — | +17 | No claim | Archive assets, mark `expired` |

**Four emails over two weeks.** More than that reads as harassment and hurts your domain.

### Why touch 2 assumes non-delivery rather than rejection

Most first emails are never seen — spam folder, wrong address, buried. Touch 2 should be
written as though it's the first contact, not a reminder. "Just following up" wastes the
subject line and signals you're a sequence.

---

## 3. Behaviour branching (on clicks, not opens)

```
SENT
 ├── clicked ──┬── claimed → exit to customer flow
 │             └── not claimed → touch 3b (warm track)
 └── never clicked ── touch 2 → touch 3 → touch 4 → expire
```

Only two states matter reliably: **clicked** and **didn't**. Anything more granular is built
on open data you can't trust.

**Immediate exits:** unsubscribe, hard bounce, reply (a human is now involved — stop the
sequence), claimed.

---

## 4. On the "50% off" idea — I'd push back

Discounting on the final touch has three problems:

1. **It trains waiting.** Once anyone learns the last email is half price, the rational move is
   to ignore the first three.
2. **It devalues the work.** $1,500 → $750 says the original number was invented. A business
   owner who was ready to pay $1,500 now wonders what it's really worth.
3. **It attracts the wrong customer.** People who only buy at 50% off are the ones who ask for
   the most support and churn first.

**Better ways to create urgency without cutting price:**

- **Real expiry** — the preview genuinely comes down. Honest, and it solves your storage worry.
- **Payment plan** — $500 × 3 removes a cash objection without lowering the price.
- **Founding-customer framing** — "first 10 Florida businesses get X included" is scarcity that
  doesn't cheapen the product.
- **Reduced scope, not reduced price** — a smaller package at a lower price is a different
  product; a discount is the same product admitting it was overpriced.

**If you still want a discount**, put it on touch 3 as a *deadline* rather than touch 4 as a
*rescue* — it reads as a launch offer instead of desperation.

---

## 5. On the expiry threat — make it true

*"Your demo will be deleted"* only works if you actually delete it. If you don't, and someone
comes back in a month to find it still there, you've taught them nothing you say is real.

**Recommended honest version:**

- Touch 4 says the preview comes down on a specific date
- On that date: **archive**, don't destroy — delete the heavy images and video, keep the HTML
  and a screenshot, set `status = 'expired'`
- The URL then shows *"This preview has expired — want it back?"* with a contact link

You keep the storage saving, the threat is true, and a late-arriving lead can still convert
instead of hitting a dead page.

**24 hours is too aggressive.** It reads as pressure and gives no room for someone on holiday.
Three days after the final email is firm but fair.

---

## 6. Templates to store

Stored in a `email_templates` table (name, subject, html, text, variables) so copy can be
edited without a deploy.

**Outreach:** `outreach_1_intro` · `outreach_2_resend` · `outreach_3_objection` ·
`outreach_3b_warm` · `outreach_4_expiry`

**Lifecycle:** `claimed_welcome` · `payment_receipt` · `site_live`

**Transactional:** `password_reset` (already needed — the Supabase default is currently broken)

Every outreach template needs: business name, demo link with tracking, unsubscribe link,
postal address, plain-text alternative *(HTML-only mail scores worse in spam filters)*.

---

## 7. What makes it "welcoming, not spam"

Concretely, from what actually moves deliverability and replies:

- **Subject: their business name, no marketing language.** "Tim Todd Consulting" beats
  "🚀 Your FREE website is ready!!" — the second is a spam-filter magnet.
- **Plain, personal formatting.** Heavy HTML templates with hero images look like marketing.
  A near-plain email that looks typed by a person gets read.
- **Lead with the specific, not the pitch.** You built *them* a site. Say that in the first line.
- **One link.** Multiple CTAs dilute clicks and raise spam scores.
- **No image-only content.** Images blocked = blank email.
- **Real reply-to that a human monitors.** `no-reply@` signals bulk and kills replies.
- **Send volume ramp:** 10 → 25 → 50 → 100/day. Blasting 500 from a new domain gets it
  blacklisted permanently.

---

## 8. Data model additions

```
email_templates      name, subject, html, text, variables, updated_at
email_sends          lead_id, template, sent_at, opened_at, clicked_at,
                     bounced_at, provider_id, sequence_step
lead_email_state     lead_id, sequence_step, next_send_at, status
                     (active | clicked | claimed | expired | unsubscribed | bounced)
unsubscribes         email, unsubscribed_at, source
```

`leads` gains: `unsubscribed_at`, `email_bounced_at`, `sequence_step`.

Why a separate `email_sends` table: `outreach_events` is the funnel log; this is the mail log.
Mixing them makes "did we already send touch 2?" hard to answer reliably.

---

## 9. The scheduler

A `pg_cron` job every hour:

1. Find leads where `next_send_at <= now()` and status is `active`
2. Respect the daily send cap
3. Render the template for the sequence step
4. Send via Resend, record in `email_sends`
5. Set `next_send_at` for the following touch
6. Separately: expire anything past its expiry date

Hourly rather than per-minute so a bug can't send thousands before you notice.

---

## 10. Decisions I need from you

1. **Postal address** for the CAN-SPAM footer?
2. **Sending domain** — `buildittoday.ai`, or a separate one so a deliverability problem can't
   burn the main domain?
3. **From name** — company, or you personally? *(Personal converts better cold.)*
4. **Reply-to inbox** — who reads replies, and how fast?
5. **Discount** — accept my argument against it, or include one anyway?
6. **Expiry window** — 3 days after the final email, or different?
7. **Daily cap** to start — I'd suggest 10/day for the first week.

---

## 11. Suggested build order

1. `email_templates` table + the 5 outreach templates *(copy first — it's the part that
   actually determines whether this works)*
2. `/admin/emails` — template editor with live preview
3. `/admin/outreach` — the sendable-leads queue you asked for
4. `send-demo-email` edge function + Resend
5. Tracking wiring (existing `/api/track/*` routes already work)
6. `pg_cron` sequencer
7. Expiry + WebP compression job
