# BuildItToday.ai — the only project document

**Written 8 September 2026, updated the same evening.** This replaces the 34
markdown files that came before it. Every number here was read from the live database, the two
repositories, or a real build — not carried over from an older document. Where
something is unverified it says so.

Read section 1 and section 3. The rest is reference.

---

## 1. The decision you asked for: which generator

**Ship with the HTML generator. Finish the engine in parallel. Do not wait for it.**

The engine is the better product. It is not the faster path to money, and those
are different questions.

| | HTML generator | site-generator-engine |
|---|---|---|
| Sites built | 43 | 31 (+1 for a real lead) |
| **Approved and ready to send** | **42** | 0 |
| **Ever served a live request** | **yes, all of them** | **no, not once** |
| Quality gates | word count, video tag, image count | 21 rendered-DOM checks incl. WCAG AA, LCP |
| Build time | unknown | 79 seconds, measured |
| Storage | working | `demo-dist` bucket is **empty** |

The engine wins on quality by a wide margin. But it has never published a page
to a real visitor, and 42 finished sites are sitting approved and unsent.

You have no revenue and no emails sent. The distance between those 42 sites and
your first reply is **one afternoon of configuration**. The distance between the
engine and your first reply is the remaining integration, deployment, and proof.

So: send with what works. Switch generators once the engine is proven, and
regenerate the good leads with it later. The engine's real value may not even be
here — see section 7.

---

## 2. Where things actually stand

### Verified from the live database

| | |
|---|---|
| Leads | **47,201** |
| Leads with an email address | **818 (1.7%)** |
| Leads reachable only by post | 46,303 |
| Leads on the map | 47,200 of 47,201 |
| Demo sites built | 43 — **all single-HTML**, all in `demo-sites` bucket |
| Demo sites approved | **42** |
| **Emails sent, ever** | **3** — all test, all to the operator, **0 to a business** |
| Leads enrolled and active in the sequence | **42** |
| Engine builds published | **0** — `demo-dist` bucket is empty |

**1.7% is the ceiling on email.** Everything else needs a postcard, which costs
real money you have said you do not have. Plan around 818, not 47,201.

### Verified in the engine repository

- 405 tests green; all 31 existing sites pass all 21 gates
- Gates can no longer be skipped — `deliver()` refuses a build without a passing
  `GateReport`; four maintenance scripts used to publish on a compile alone
- Invented statistics ("100+ Projects delivered") removed at source and gated
- Per-build `site_url` and `indexable` flag work — proven on a real build
- One real lead built end to end: **Inshore Landscape & Design, 79 seconds**,
  all gates passed, zero invented facts across 1,196 words

### Written but never run

The multi-file serving layer exists and compiles: `public-site.ts`,
`[siteSlug]/[...sitePath]/route.ts`, `engine-ingest.ts`, and a `demo-dist`
migration. **It is uncommitted and has never served a request.**

### Not verified

- **Build cost.** The documented $0.09 / $0.25 has never been measured. The CLI
  now prints it; the next build will settle it.
- **No live payment has ever been taken.** The live catalogue and webhook now
  exist, but the live secret key is not yet in the application, so the money
  path is built and unproven.
- **The live engine API.** No authenticated call has been made to it from here.

---

## 3. The plan, in order

### Done on 8 September

**Step 1 — email sending is on.** Postal address set to 1630 NW 19th Street,
Unit 710, Miami, FL 33125 — legally required in every commercial email.
`sending_enabled` on, daily cap raised from 10 to 25. The whole chain was then
proven: three emails sent, all accepted by Resend, all redirected to the
operator by test mode, none to a business. The unsubscribe link was tested and
works. `List-Unsubscribe` is set.

**The data leak is closed.** Eleven API routes answered 200 to anyone —
`/api/admin/overview`, `/api/demo-sites`, `/api/customers`,
`/api/potential-customers` and the lead routes all returned real data with no
session. They now require an admin. Found while checking it was safe to send;
that batch would have driven 25 businesses to a site whose lead and customer
tables were public.

**Stripe is built out in both modes** on the real account
(`acct_1U4JrcAoS4OZ0yM0`). Three products and three recurring prices per mode,
tax code `txcd_10701100`, found at runtime by `lookup_key`:

| Tier | lookup_key | Monthly |
|---|---|---|
| Starter | `bit_starter_monthly` | $50 |
| Professional | `bit_professional_monthly` | $99 |
| Signature | `bit_signature_monthly` | $199 |

The setup fees ($750 / $1,500 / $3,500) need no products — checkout creates
them inline, named after the business, tax code `txcd_10000000`. Verified on a
real session: two line items, $99 recurring and $1,500 one-time, $1,599 total.

Webhooks created in both modes at `/api/webhooks/stripe` for
`checkout.session.completed`, `customer.subscription.updated`,
`customer.subscription.deleted`, `invoice.payment_failed`.

| Mode | Webhook secret |
|---|---|
| Live | `whsec_Vf2HELCOi2kJ3heawJ2m2BbrEuRdlr1z` |
| Test | `whsec_yHaTi9CbZTRyBPSxXVdyJtXyjqp5lk9t` |

### Step 2 — the three things left before money

**a. Paste the two Stripe secret keys.** Developers → API keys, one per mode,
into `/admin/integrations`. Stripe never exposes secret keys through its API,
so this cannot be automated. Until it is done the application still uses the
old sandbox account and **no real payment can be taken**.

**b. Verify a live checkout.** Confirm the session comes back as `cs_live_…`,
pay it, and confirm the webhook creates the customer row.

**c. Flip `test_mode` to false.** 25 emails go that day, 17 the next, then
touches 2, 3 and 4 run on their own schedule.

### Step 3 — answer replies by hand

No automation to build. Reply personally and find out what people object to.

### Step 4 onward — the engine

Unchanged from the original plan: apply the `demo-dist` migration, upload the
Inshore build, prove the serving path, then automate the build loop, then
retire the HTML generator. None of it blocks revenue.

---

## 4. Known problems, unfixed

| Problem | Where | Severity |
|---|---|---|
| **Cost per site is now real money.** Three photographs and a clip cost about $0.27 per lead, on top of the HTML model. At the cap of 10 a day that is roughly $3/day, and it is spent before anyone has replied. Worth watching against reply rate rather than assumed. | Supabase | Medium |
| **Cron secret in plaintext** inside `cron.job` command text — anyone with database read access can see it | Supabase | **High — rotate it** |
| 30 engine sites carry invented statistics and are frozen (they fail the new content gate) — includes two law firms publishing "98% On-time delivery" | Engine | Medium |
| 195 leads have filing dates in the future | Database | Medium |
| SunBiz runs twice: Vercel cron at 06:00 UTC does the work, `pg_cron` at 10:00 repeats it and logs a false "skipped" on the Agents page | Both | Low |
| 11,517 leads classified "Unclear" — 24% of the book | Database | Medium |
| 12 of 18 tables exist nowhere in git; repo cannot rebuild the database | BuildItToday | Medium |
| `.env` has no trailing newline on the VPS — the documented corruption trap is armed | Engine host | Low |
| `api/customers` invents a demo URL with `Math.random()` | BuildItToday | Low |
| No test suite at all on the BuildItToday side | BuildItToday | Low |

---

## 5. Operational reference

### The email sequence

Five touches. Entry is a lead with an email, an approved site, and no
unsubscribe.

| # | Day | Trigger | Angle |
|---|---|---|---|
| 1 | 0 | Entry | "We built a website for {business}. Here it is." |
| 2 | +3 | No click | Different subject, same link — assume touch 1 was never seen |
| 3 | +8 | No click | Handle the objection: is this real, what's the catch |
| 3b | +8 | **Clicked, no claim** | Different email — they are interested, ask what stopped them |
| 4 | +14 | Still no claim | The preview comes down |

Rules that already exist in code and must not be weakened: at most three sends
per run so the cadence looks human; a duplicate guard reads `email_sends`
independently of state; the status vocabulary mirrors a database CHECK
constraint — writing an invalid status once caused a mail loop that re-sent
touch 4 every run.

**Open tracking is largely broken** (Apple Mail Privacy Protection pre-fetches
images). Judge on clicks, not opens.

### Pricing

| Tier | Setup | Monthly | Action |
|---|---|---|---|
| Starter | $750 | $50 | Stripe checkout |
| Professional | $1,500 | $99 | Stripe checkout — the headline |
| Signature | $3,500 | $199 | Book a call |

Single source of truth: `src/lib/pricing.ts`. Never hardcode a price anywhere else.

### Scheduled jobs

Nine, all in Supabase `pg_cron`, all visible at `/admin/agents`:
lead scraper (weekdays 10:00 UTC), classifier (every 15 min, only when work is
pending), map placer (weekdays 10:40), site builder (11:00), hero-clip collector
(every 15 min), quality gate (11:40), outreach sequencer (hourly 13:00–23:00),
renewal reminders (14:05), Telegram digest (12:00).

The site builder runs the whole chain in order: copy → photography and hero clip
→ HTML → gate → email. Media is ordered one day and the HTML built the next,
because a clip takes about eighty seconds to render and the builder does not
wait for it. The collector picks up finished clips every quarter hour.

`pg_cron` reports "succeeded" when a request is *queued*, not when it is
answered. The Agents page shows the real response bodies — trust those.

### Costs

| Item | Figure | Confidence |
|---|---|---|
| Three photographs per site | $0.13 | measured, 9 Sep |
| Hero clip per site | $0.14 | measured, 9 Sep |
| Media per site, total | $0.27 | measured, 9 Sep |
| Engine build, no video | $0.09 | documented, **not measured** |
| Engine build with video | $0.25 | documented, **not measured** |
| All 818 email-reachable leads | ~$205 | follows from the above |
| Postcards (Lob) | ~$0.75 each | 46,303 leads = $34,000 — **do not blanket send** |

---

## 6. Things that must not be done casually

- **Do not bulk-send.** A delivery or unsubscribe error scales instantly. Twenty first.
- **Do not enable Lob postcards** until email is proven and you can afford it.
- **Do not weaken a gate to make a build pass.** If a gate fires, either the site
  is wrong or the gate is wrong — establish which by measuring.
- **Do not delete the legacy generator or the 43 sites** until the engine has
  served real traffic for a while.
- **Do not deploy demos individually to Vercel.** It bypasses tracking, the offer
  layer, and Stripe.
- **Do not commit the cron secret**, and do not put it in a migration file.

---

## 7. The strategic question, stated once

The engine has API-key auth, a job queue, and per-build cost tracking. That is
the shape of a product, not an internal tool.

Cold outreach to Florida LLCs has a hard ceiling: 818 reachable people, one sale
per site. Selling generation to agencies — who already have clients who need
sites — has no such ceiling, and one customer means many sites.

This is not a reason to stop what you are doing. It is a reason to keep the
engine free of lead-pipeline concepts, which section 1's plan already does, so
the option stays open.

---

## 8. Handover checklist

The project is finished when someone else can run it:

- [ ] Architecture and data-flow diagram
- [ ] Environment and secret ownership register (no secret values)
- [ ] Daily operating runbook
- [ ] Deployment and rollback guide
- [ ] Cost and funnel metric definitions
- [ ] Customer site transfer process
- [ ] A second operator has run one full cycle without help

---

## Appendix — what was deleted

34 markdown files were merged into this one on 8 September 2026. They contained
genuine history but also contradicted each other and the code: lead counts from
14,703 to 47,201, claims that the domain was parked, plans for a `backend/`
service that never existed, and three separate architectures. Anything still
true is above. The rest is in git history if it is ever needed.

Two documents were **kept**, because they describe systems rather than status:

- `site-generator-engine/CLAUDE.md` — how the engine works and the traps in it
- `pipeline/README.md` — the local Python pipeline
