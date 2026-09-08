# BuildItToday.ai — the only project document

**Written 8 September 2026.** This replaces the 34 markdown files that came
before it. Every number here was read from the live database, the two
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
| **Emails sent, ever** | **0** |
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
- **Stripe is on test keys.** No live payment has ever been taken.
- **The live engine API.** No authenticated call has been made to it from here.

---

## 3. The plan, in order

Do these in sequence. Do not skip ahead. Each step ends in something you can
check, and the first four are the only ones between you and a reply from a real
business.

### Step 1 — Turn on email sending

Nothing else matters until this works.

- Resend: verify the sending domain, set the API key in the deployed environment
- Add the postal address at `/admin/emails` — **CAN-SPAM requires a physical
  address in every commercial email; without it the whole batch is illegal**
- Confirm test mode is ON, send one email to yourself, confirm it arrives

**Check:** an email from the real sequence lands in your own inbox, renders
correctly, and its unsubscribe link works.

### Step 2 — Send twenty

Not 818. Twenty.

- Pick 20 approved sites whose leads have an email — use `/admin/inventory` to
  choose the cohort
- Read all 20 emails and open all 20 demo URLs yourself before sending
- Turn test mode off, send, and watch

**Check:** 20 delivered, 0 bounces, opens and clicks recorded on the leads.

This is the single most valuable thing you can do. It tells you whether any of
this sells, which nothing built so far has ever tested.

### Step 3 — Answer replies by hand

There is no automation to build here. Reply personally, book calls, and find out
what people actually object to. The email sequence handles follow-up on its own.

**Check:** you have spoken to at least one business owner.

### Step 4 — Take a real payment

Only once someone wants to buy.

- Run `frontend/scripts/stripe-setup.mjs` against live keys
- Register the live webhook, put live keys in `/admin/integrations`
- Do one real checkout end to end and confirm the customer record appears

**Check:** money in the account, customer row created, welcome email sent.

**Steps 1–4 are the whole business.** Everything below improves it.

### Step 5 — Finish the engine integration

The serving layer is written. It needs proving.

1. Apply `20260906_create_demo_dist_bucket.sql`
2. Upload the Inshore build (114 files) to `demo-dist/inshore-landscape-design/`
3. Insert its `demo_sites` row with `generator_version = 'engine-1'`
4. Load `buildittoday.ai/inshore-landscape-design` and check: JS loads, images
   and video play, `/services` deep-links, the offer modal opens, the response
   carries `X-Robots-Tag: noindex`
5. Commit the serving layer — it is still uncommitted

**Check:** the Inshore site serves correctly from the real domain.

### Step 6 — Automate the build loop

- A cron tick submits builds; a **later** tick collects them. Vercel functions
  die at 300 seconds and a build takes longer — never poll inside one request.
- Record `gates`, `spend`, and `generator_version` on `demo_sites`
- Hard daily spend cap so a loop cannot drain the budget overnight
- Only `interrupted` jobs may be retried. A `blocked` build already cost money.

**Check:** 20 sites built unattended, spend within cap, a broken brief recorded
as blocked and not retried.

### Step 7 — Retire the HTML generator

Once step 6 is proven. Do not finish deploying v13. The 43 legacy sites keep
serving through the existing single-file path; `site-gate.ts` stays alive for
them alone.

### Step 8 — Deploy the engine properly

It runs on a laptop today. It needs a container host, persistent artifact
storage, secrets, and a restart policy. Fly.io config exists but is unverified.

---

## 4. Known problems, unfixed

| Problem | Where | Severity |
|---|---|---|
| **Cron secret in plaintext** inside `cron.job` command text — anyone with database read access can see it | Supabase | **High — rotate it** |
| `/api/*` routes have no server-side admin guard; middleware only covers `/admin/*` | BuildItToday | **High — lead and customer data** |
| 30 engine sites carry invented statistics and are frozen (they fail the new content gate) — includes two law firms publishing "98% On-time delivery" | Engine | Medium |
| 195 leads have filing dates in the future | Database | Medium |
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

Seven, all in Supabase `pg_cron`, all visible at `/admin/agents`:
lead scraper (weekdays 10:00 UTC), classifier (every 15 min, only when work is
pending), map placer (weekdays 10:40), quality gate (11:40), outreach sequencer
(hourly 13:00–23:00), renewal reminders (14:05), Telegram digest (12:00).

`pg_cron` reports "succeeded" when a request is *queued*, not when it is
answered. The Agents page shows the real response bodies — trust those.

### Costs

| Item | Figure | Confidence |
|---|---|---|
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
