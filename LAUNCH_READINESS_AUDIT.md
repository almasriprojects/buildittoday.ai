# Launch Readiness Audit — autosite.ai / BuildItToday.ai

*Audited 2026-08-21. Sources: all 16 root MD docs, live Supabase schema, deployed edge functions,
Next.js route inventory, production build, and the 19 demo pages generated today.*

**Docs were cross-checked against the running system, not taken at face value — several long-standing
"pending" items are actually done, and several "done" items are actually broken.**

---

## 0. Bottom line

The **demo generation engine is real and working**. Everything that turns a demo into money is not.

| Layer | State |
|---|---|
| Lead acquisition (SunBiz → classify → skip-trace → maps) | ✅ Working, 14,703 leads |
| Demo generation (brief → images → video → HTML) | ✅ Working, 19 pages live |
| **Public hosting** | ❌ **Domain is parked — nothing is deployed** |
| **Outreach sending** | ❌ **No email provider exists** |
| **The offer itself** | ❌ **Claim modal drifted; no price anywhere** |
| Payment → customer | ⚠️ Stripe wired, never tested end-to-end |

**Nothing has been sent to a single lead. Revenue to date: $0. Customers: 0.**

The blocker is *not* the pipeline. It is that there is no public site, no way to send, and no offer on the page.

---

## 1. Verified working (checked live, not from docs)

### Lead pipeline — 14,703 leads
| Edge function | Version | Purpose |
|---|---|---|
| `sunbiz-pull` | v4 | Pulls new FL registrations |
| `classify-leads` | v6 | Assigns `business_category`, `target_fit` |
| `skip-trace-leads` | v9 | Finds owner email/phone |
| `maps-check-leads` | v4 | Detects whether they already have a website |
| `geocode-leads` | v4 | Lat/long for the map |
| `generate-site` | v7 | Writes `generated_content` (copy) |
| `generate-design-html` | v12 | Builds HTML page |
| `send-postcards` | v5 | Lob integration (test mode) |

Funnel today: **14,703 total → 776 with email → 497 with email AND no existing website → 45 with copy → 38 fully sendable.**

### Demo engine (built today)
- 4-stage design brain: style brief → 3-scene plan → images → video montage → HTML.
- Per-lead unique palette, Google Fonts, scenes. Verified across 7 categories.
- **Real cost $0.44–0.50/lead** (measured, not estimated) → ~$210 for all 462 qualified leads.
- Hero videos compressed **86–90%** (4.3 MB → 0.4–0.6 MB).
- Vision gate catches AI-rendered text in images — 5/5 on a labelled test, $0.00047/image.
- Validator + one corrective retry; caught a real defect on **6 of 7** first builds.

### Database (7 tables — docs claimed only 2)
`leads` (78 cols), `customers`, `demo_sites`, `demo_media`, `category_design_references`,
`outreach_events`, `potential_customers`.

### Routes that exist and build clean
All `/admin/*` pages (dashboard, leads, map, customers, campaigns, analytics, billing, settings),
`/api/track/{open,click,scan}`, `/api/signup`, `/api/potential-customers`, `/api/checkout` (real Stripe SDK),
`/demo/[businessId]` → correctly redirects to `/demo-sites/[slug]`.

---

## 2. 🔴 Blockers — cannot make money until these are fixed

### B1. The domain is parked. Nothing is deployed.
`autosite.ai` returns a 114-byte redirect to `/lander`. Not linked to Vercel. `NEXT_PUBLIC_URL` is still
`http://localhost:3050`. Every route above exists **only on this Mac**.

Consequence: no QR code can work, no email link can work, and the tracking endpoints
(`demo_viewed_at`, `qr_scanned_at`) can never fire.

### B2. No email provider. At all.
No Resend, SendGrid, Postmark, Mailgun, or SES anywhere in the project. `send-demo-email` from
`NEXT_PHASE_PLAN.md` §4 was never built. Postcards via Lob exist but are in **test mode**.

### B3. The claim modal lost the offer — 16 of 19 pages
The modal is the **only** place the pitch is made. It has drifted into a customer-facing business CTA:

| What it says now | What it must say |
|---|---|
| "Transform Your Home Today" | "This website was built for {business}. Claim it." |
| "Experience Bubba & Duck's" | + what they get, + the price, + how to pay |
| "Get Your Marine Service Started" | |

Only 3 of 19 pages actually pitch claiming the site. **Root cause:** the build prompt asks for
"heading, 4-item feature list, one CTA" but never states the modal is a sales pitch to the *owner*.

### B4. No price on any page
$1,500 setup + $50/month appears in the docs and nowhere in the product. A lead who wants to buy
has no path to pay.

### B5. Not a git repository
`git rev-parse` fails at project root. No version control, no GitHub, no deploy history, no rollback.
Every plan doc and all pipeline code exists only on this machine.

---

## 3. ⚠️ Real but non-blocking issues

| # | Issue | Impact |
|---|---|---|
| C1 | `/api/generate` still returns `Math.random()` mock data | Admin "generate" button is fake |
| C2 | `demo_media` has 6 rows; ~28 leads actually generated | Batch writes local JSON, not the DB |
| C3 | 18% of leads get <3 video clips (1 lead got 1 clip) | 1-clip hero visibly jump-cuts every 4s |
| C4 | Media/build pipeline is local Python, not deployed | Can't run unattended; not in the edge function |
| C5 | Personal-care categories lose scenes to content filters | Spa/nails/massage — 2 confirmed cases |
| C6 | Image model renders text despite prompts (~44% flag rate) | Vision gate catches it; 2 needed manual judgement |

---

## 4. Answers to the specific questions raised

**"How does each lead get their own proper URL?"**
It already works: `/demo-sites/{document_number}` serves the page, and `/demo/{document_number}`
redirects to it. All 38 sendable leads have a `demo_sites` row. **It only needs the domain deployed** (B1).

**"Will the QR code URL match?"**
Yes — `/api/track/scan?lead={id}` logs the scan then redirects to `/demo/{slug}`, which chains to the real
page. The chain is correct and already built. It is dead only because of B1.

**"Is the HTML mobile compatible?"**
Yes — verified at 375px on multiple pages: video hero legible, hamburger opens a clean 280px panel with no
overlap, media sequence and modal both work. This was a real bug earlier and is fixed.

**"Fix the claim popup, add a price"** → B3 + B4. Confirmed broken on 16 of 19 pages.

**"Push to GitHub"** → B5. Not a repo yet.

**"Create agents for the whole process"**
Most already exist as edge functions (§1). What is genuinely missing: **send-demo-email**, a
**follow-up/nurture** agent, and a **conversion** agent. The scraping/filtering/enrichment agents you
described are built and running.

---

## 5. Launch checklist — strict order

### Stage 1 — Make it real (nothing works without these)
1. `git init`, commit, push to GitHub.
2. Deploy frontend to Vercel; point `autosite.ai` at it; set `NEXT_PUBLIC_URL`.
3. Smoke-test in production: `/demo-sites/{slug}` renders, `/api/track/scan` redirects and logs.

### Stage 2 — Make the offer (B3 + B4)
4. Rewrite the claim modal in the build prompt: pitch to the **owner**, name the business, state the
   price, single "Claim This Website" CTA → Stripe checkout.
5. Add a validator rule rejecting any modal that doesn't pitch claiming the site — this class of drift
   must fail the build, not ship.
6. Rebuild all pages (~$0.19 each).

### Stage 3 — Make it sendable
7. Choose sending domain (recommend a **separate** domain so deliverability problems can't burn `autosite.ai`).
8. Set up Resend + SPF/DKIM/DMARC; warm the domain.
9. Build `send-demo-email` with the tracking pixel + click link already routed.
10. Send **10 first**, verify open/click land in `outreach_events`, then 25.

### Stage 4 — Close the loop
11. Test Stripe end-to-end with a real card.
12. `/admin/potential-customers` + "Mark Paid" (planned in `NEXT_PHASE_PLAN.md` §7, never built).
13. `/admin/attribution` funnel report.

### Stage 5 — Scale
14. Fix C2 (write `demo_media` from the batch), C3 (top-up), C1 (real `/api/generate`).
15. Productionize the media worker (`DEMO_MEDIA_WORKER_PLAN.md`) — NCA Toolkit on the VPS makes a
    fully-Supabase state machine viable.
16. Generate the remaining ~459 qualified leads (~$210).

---

## 6. Cost model (measured)

| Item | Cost |
|---|---|
| Per lead, full premium demo | $0.44–0.50 |
| 38 sendable leads | ~$17 |
| All 462 qualified leads | ~$210 |
| Vision gate, all 462 | ~$0.65 |
| Email (Resend, <3k/mo) | free tier |

Revenue needed to break even on all 462: **one sale.**

---

## 7. Decisions needed from you

1. **Vercel + DNS** for `autosite.ai` — do you have access?
2. **Sending domain** — `autosite.ai` or a separate one?
3. **Price on the modal** — $1,500 + $50/mo as documented, or different?
4. **Payment flow** — Stripe checkout directly from the demo, or "book a call" first?
5. **GitHub** — public or private repo, which account?
