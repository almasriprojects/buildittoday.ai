# Road to a Self-Running System

**Status:** DRAFT — read, adjust, then we execute in order.
Written 2026-08-22, grounded in live database numbers, not estimates.

---

## 1. Two things you raised, answered first

### Property management classification — already correct

I checked rather than assumed. The `classify-leads` prompt already says property
management companies are **"Real Estate Services"** and that this category **"DOES count as
a yes candidate."** The code even carries a comment about a previous fix to
"the Real Estate Investment over-exclusion."

Live data confirms it:

| | |
|---|---|
| Property-management-named leads marked **yes** | **31** |
| Real Estate Services marked **yes** | **197** |
| Still marked no | 1 (`Nissim Adar 770 Management LLC` — a numbered entity, defensibly passive) |

I sampled the 491 excluded "Real Estate Investment" leads. They are genuinely passive:
`113-115 Se 1st Street Realty`, `Ako Properties LLC`, `Bayshore Rental LLC` — street
addresses and holding entities, not businesses with customers. **No change needed.**

### Email for the domain — receiving vs sending are different problems

**To receive at `contact@buildittoday.ai`** — Cloudflare Email Routing, free, ~5 minutes:
Cloudflare dashboard → your domain → Email → Email Routing → add `contact@` and forward it to
whatever inbox you actually read. Cloudflare adds the MX records itself.

**To send 500+ outreach emails** — that is a separate system. Cloudflare routing only
*forwards*; it cannot send bulk mail, and sending from a Gmail address will land you in spam.
That needs Resend (Section 4).

**My recommendation on the address:** `contact@` for the public site (done, pushed). For
outreach, send from something like `hello@` or a person's name — replies to a monitored
inbox convert better than a generic one. Never send bulk from the same address you publish
publicly for support; if it gets flagged, you lose both.

---

## 2. The real state of the funnel

This is the number that matters most, and it is not what I expected:

```
20,154  leads pulled from SunBiz          ← growing daily via cron
 7,438  classified                 (37%)  ← 12,716 never touched
 4,387  target_fit = yes
 2,827  checked on Google Maps     (14%)
   912  skip-traced for email       (5%)
    45  have generated copy
    43  have a finished demo site
     0  contacted                          ← the whole business is here
```

**The pipeline is not the bottleneck — the backlog is.** You have 4,387 qualified leads and
have processed 45 of them. Everything downstream is starved because the middle of the funnel
was never run at scale.

Notably `sunbiz-pull` *is* running: the total went from 14,703 to 20,154 during this session.
Leads accumulate; nothing processes them.

---

## 3. What is genuinely missing

| # | Gap | Consequence |
|---|---|---|
| 1 | **No email sending** | Cannot contact anyone. Hard blocker. |
| 2 | **No email templates** | Nothing to send even once sending works. |
| 3 | **Pipeline backlog not automated** | 12,716 leads sit unclassified forever |
| 4 | **Admin: 4 pages show invented data** | Customers/Campaigns/Analytics/Billing read `mock-data.ts` |
| 5 | **No potential-customers or attribution page** | Cannot see who signed up or which channel works |
| 6 | **Booking calendar is fake** | Takes a time slot, discards it, redirects to register |
| 7 | **Attribution gaps** | `demo_viewed_at` and `acquisition_channel` never populate |
| 8 | **Media pipeline is local Python** | Demo generation cannot run unattended |
| 9 | **Stripe on test keys** | Deliberately last, per your call |

---

## 4. Build order

### Phase A — Make it possible to earn (this week)

**A1. Email infrastructure**
- Cloudflare Email Routing for `contact@` (receiving) — 5 min, you can do now
- Resend account, verify `buildittoday.ai`, add SPF/DKIM/DMARC in Cloudflare
- **Warm the domain**: 10 emails day 1, 25 day 2, 50 day 3. Sending 500 cold on a new
  domain gets the domain blacklisted, and you cannot undo that.

**A2. Email templates + `send-demo-email`**
- One template: their business name, a screenshot of their actual demo, a tracked link
- Tracking pixel → `/api/track/open`, button → `/api/track/click` (both already built)
- Edge function pulls leads where demo is `approved` and `outreach_sent_at IS NULL`

**A3. Fix the two attribution gaps** — log `demo_viewed_at` on demo render, persist
`acquisition_channel` from `?src=`. Without these you cannot tell what worked.

**A4. Send 10.** Measure. Then 25.

### Phase B — Make the admin honest (alongside A)

**B1. Delete the 4 mock pages' fake data.** Replace with real queries and empty states.
An empty "No customers yet" is more useful than five invented ones — the day you get a real
customer you will not know which numbers are real.

**B2. Build `/admin/potential-customers`** — who signed up, from which channel, mark paid.

**B3. Build `/admin/attribution`** — the funnel per channel. This is how you learn whether
postcards or email convert, which decides where every future pound goes.

**B4. Fix the booking calendar** — either wire it to save a real booking, or remove it.
It currently promises a call nobody will make.

**B5. Fix `/api/generate`** — still returns `Math.random()`.

### Phase C — Make it run itself (the actual goal)

**C1. Automate the pipeline backlog.** `pg_cron` chains the existing edge functions on a
schedule: pull → classify → maps-check → skip-trace → generate-site. Each already works;
none run automatically at volume. This alone converts 12,716 dormant leads into candidates.

**C2. Productionise media generation.** Currently local Python. Options in
`DEMO_MEDIA_WORKER_PLAN.md`; your NCA Toolkit VPS makes a Supabase state-machine viable
since it provides ffmpeg over HTTP.

**C3. Automated follow-up.** Nobody buys on email one. A 3-touch sequence (day 0, day 4,
day 11) typically doubles response versus a single send.

**C4. Daily digest** — one email each morning: sent, opened, clicked, signed up, paid.
This is what lets you "only work when deals close."

### Phase D — Take the money (last, as you asked)

**D1.** Stripe live keys · **D2.** Webhook secret + verify end-to-end · **D3.** Delivery
flow after payment — the genuinely unbuilt part: what happens between "paid" and "their site
is live on their domain."

---

## 5. What "runs by itself" actually means

Realistically automatable: lead pull, classification, enrichment, demo generation, sending,
follow-up, tracking, payment capture.

**Not automatable, and you should not want it to be:**
- **Final quality check before sending.** AI image models produce garbled text ~25% of the
  time. We caught two today that would have embarrassed you. A human glance at flagged sites
  stays necessary.
- **Delivery after payment.** Someone pays $1,500 expecting a real site on their domain.
  That handoff needs a person until it is proven repeatable.
- **Replies.** A business owner who answers wants a human.

The honest version of your goal: **you review flagged demos and close deals; everything else
runs unattended.** That is achievable. Fully hands-off is not, and pretending otherwise is
how you end up with an angry customer.

---

## 6. Immediate next actions

| Who | What |
|---|---|
| **You** | Cloudflare Email Routing for `contact@` (5 min) |
| **You** | Create a Resend account, tell me the sending domain choice |
| **Me** | A3 attribution fixes + B1 gut the mock pages (no dependencies) |
| **Me** | Then A2 email templates once Resend is verified |

**Decisions I need:**
1. Send outreach from `buildittoday.ai` directly, or a separate domain to protect the main one?
2. Sender name — company, or you personally? *(Personal converts better cold.)*
3. Postcards this round, or email only first?
