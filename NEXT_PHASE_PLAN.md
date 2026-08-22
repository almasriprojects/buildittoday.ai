# 🚀 NEXT PHASE PLAN — Demo Generation → Outreach → Potential Customer → Customer

*Generated 2026-08-17. The complete execution plan for turning leads into paying customers, with email/postcard outreach and full attribution tracking.*

---

## 1. THE JOURNEY (End-to-End)

```
Lead (SunBiz, document_number e.g. L26000424924)
   │
   ▼
Generate Demo Site → /demo/{document_number}  (1-page unique design)
   │
   ├── Email channel: automatic email → sign up to view demo
   └── Postcard channel: QR code → sign up to view demo
   │
   ▼
View Demo + Sign Up = LEAD → POTENTIAL CUSTOMER
   │
   ▼
Pays ($1,500) = POTENTIAL CUSTOMER → CUSTOMER
```

**Attribution tracking at every step:**
- Did they open the email? (tracking pixel)
- Did they click the email link? (redirect tracking)
- Did they scan the QR code? (QR redirect tracking)
- Did they ignore the postcard/email completely? (14-day no-engagement flag)
- **Which channel converts best?** (email vs postcard funnel report)

---

## 2. DEMO SITE DESIGN DECISION

### Each business gets a unique design via: **Industry-Template + AI-Unique-Content**

```
┌──────────────────────────────────────────────────────┐
│ HOW UNIQUE DESIGNS WORK AT SCALE                      │
│                                                       │
│ 1. 10 INDUSTRY TEMPLATES (one per business_category): │
│    • Pre-built layout + fonts + component structure   │
│    • Industry-appropriate imagery & section order     │
│    • e.g. Health & Wellness: soft colors, calming     │
│         Food & Beverage: warm tones, menu preview     │
│    • Built once, stored as design_templates in DB     │
│                                                       │
│ 2. AI-GENERATED UNIQUE CONTENT (per lead):            │
│    • Tagline, hero headline, 3–4 services, about      │
│      copy, "why choose us", contact CTA — written     │
│      specifically for THAT business                   │
│                                                       │
│ 3. UNIQUE ACCENT COLOR (derived from business name):  │
│    • Each site gets a distinct accent so no two       │
│      demos feel identical in the same industry        │
└──────────────────────────────────────────────────────┘
```

### Page Structure

| Stage | Pages | Why |
|-------|-------|-----|
| **Demo (from email/QR)** | **1 page** | Fast load (< 2s proves speed), zero friction, single "Claim This Website" CTA |
| **After payment** | **3–5 pages** | Expand using the SAME generated content: Home, About, Services, Contact, Testimonials |

### Demo Page Sections (1 scroll = future Home page)

1. **Header** — business name + phone + "Claim This Website"
2. **Hero** — business name, unique tagline, CTA → sign-up gate
3. **Services** — 3–4 industry-specific services (AI-generated)
4. **About / Why Choose Us** — short unique copy
5. **Testimonials** — generic but realistic for the industry
6. **Contact** — phone, form, hours
7. **Footer** — "Powered by BuildItToday.ai"

---

## 3. DATABASE SCHEMA (one additive migration)

### 3a. Leads — new columns
```sql
ALTER TABLE leads ADD COLUMN IF NOT EXISTS
  outreach_sent_at       timestamptz,
  email_opened_at        timestamptz,
  email_clicked_at       timestamptz,
  qr_scanned_at          timestamptz,
  demo_viewed_at         timestamptz,
  signup_completed_at    timestamptz,
  potential_customer_at  timestamptz,
  converted_at           timestamptz,
  acquisition_channel    text;   -- 'email' | 'postcard'
```

### 3b. `potential_customers` — the middle stage
```sql
CREATE TABLE potential_customers (
  id            uuid primary key default gen_random_uuid(),
  lead_id       uuid references leads(id) on delete cascade,
  demo_slug     text,
  email         text,
  full_name     text,
  source        text,             -- 'email' | 'postcard'
  status        text default 'new',  -- 'new' | 'paid' | 'lost'
  converted_at  timestamptz,
  created_at    timestamptz default now()
);
```

### 3c. `outreach_events` — THE attribution log (most important)
```sql
CREATE TABLE outreach_events (
  id           uuid primary key default gen_random_uuid(),
  lead_id      uuid references leads(id) on delete cascade,
  channel      text,   -- 'email' | 'postcard'
  event_type   text,   -- 'sent' | 'opened' | 'clicked' | 'scanned' | 'viewed' | 'signed_up' | 'paid'
  occurred_at  timestamptz default now()
);
```

Attribution query (powers the report):
```sql
SELECT channel, event_type, COUNT(*) FROM outreach_events GROUP BY channel, event_type;
```

### 3d. `design_templates` — 10 industry designs
```sql
CREATE TABLE design_templates (
  id            uuid primary key default gen_random_uuid(),
  industry      text unique,        -- business_category
  template_name text,
  layout_json   jsonb,              -- section order, component structure
  base_colors   jsonb,              -- palette
  fonts         jsonb,              -- heading/body fonts
  created_at    timestamptz default now()
);
```

### 3e. `public_demo_sites` — extend (exists already)
```sql
ALTER TABLE public_demo_sites ADD COLUMN IF NOT EXISTS
  template_id   uuid references design_templates(id),
  accent_color  text;
```

---

## 4. SUPABASE EDGE FUNCTIONS NEEDED

| # | Edge Function | Purpose | Runs When |
|---|---------------|---------|-----------|
| 1 | `generate-demo-sites` | Batch loop: build-queue leads → pick template → AI content → insert `public_demo_sites` (slug = document_number) → update `leads.site_generated` | Admin "Generate Sites" or `/api/leads/process` |
| 2 | `send-demo-email` | Send "preview ready" email with tracking pixel + click link | After sites generated, email-channel leads |
| 3 | `send-postcards` | Generate QR (encodes `/api/track/scan?lead=...`), create Lob order, update `postcard_sent` | Postcard-channel leads |
| 4 | `track-outreach-2` | Fallback event logger (guaranteed delivery during redirects) | Invoked by `/api/track/*` |
| 5 | `cron-mark-ignored` | Daily: flag leads sent > 14 days with zero engagement | Vercel Cron → `/api/leads/cron` |
| 6 | `stripe-conversion-webhook` | Verify payment → create customer from potential customer → link lead → log `paid` | Stripe event |

**Note:** #1 and #5 are edge functions for long-running batch work (no Vercel 60s limit). All deploy via `supabase/functions/` like the working `geocode-leads`.

---

## 5. API ROUTES (Next.js side)

| Route | Method | Purpose |
|-------|--------|---------|
| `/api/demo/generate` | POST | Trigger bulk generation loop (edge function #1) |
| `/api/track/open` | GET | Email open pixel → log `opened` + set `leads.email_opened_at` |
| `/api/track/click` | GET | Email link redirect → log `clicked` + redirect to demo |
| `/api/track/scan` | GET | QR redirect → log `scanned` + redirect to `/demo/{doc#}?src=postcard` |
| `/api/signup` | POST | Create `potential_customers`, log `signed_up`, set cookie, unlock demo |
| `/api/potential-customers` | GET | Admin list with funnel data |
| `/api/potential-customers/[id]/paid` | POST | Mark paid → create customer, link lead, log `paid` |
| `/api/attribution` | GET | Funnel report by channel |

---

## 6. ADMIN PAGES TO ADD

| Page | Purpose |
|------|---------|
| `/admin/potential-customers` | Table: business, email, source (email/postcard), status, converted + "Mark Paid" action |
| `/admin/attribution` | Funnel table: Sent → Opened/Scanned → Clicked/Viewed → Signed Up → Paid (per channel, with conversion % + revenue) |

Existing pages reused: `/admin/leads` (add "Generate Sites" + "Send Outreach" buttons), `/admin/customers` (receives converted leads), `/demo/[businessId]` (add sign-up gate), `/pricing` (checkout entry).

---

## 7. IMPLEMENTATION CHECKLIST (step-by-step, nothing breaks)

### ✅ Phase 0 — Preparation (no code changes)
- [ ] 1. Create `NEXT_PHASE_PLAN.md` report at root (this document)
- [ ] 2. Confirm email provider (Resend / SendGrid / Postmark — or manual testing first)
- [ ] 3. Confirm postcard path (Lob API now, or QR images + manual print to test)
- [ ] 4. Confirm sign-up: simple name + email (no verification) — recommended

### 🏗️ Phase 1 — Database Foundation (additive ONLY — existing tables untouched)
- [ ] 5. Write migration `20260817_next_phase_pipeline.sql`
  - [ ] 5a. leads new columns (section 3a)
  - [ ] 5b. `potential_customers` table (section 3b)
  - [ ] 5c. `outreach_events` table (section 3c)
  - [ ] 5d. `design_templates` table (section 3d)
  - [ ] 5e. extend `public_demo_sites` (template_id, accent_color — section 3e)
- [ ] 6. Apply migration to Supabase (CLI or SQL editor)
- [ ] 7. Verify existing tables intact (leads, customers, public_demo_sites counts)
- [ ] 8. Update `lib/types.ts`: new Lead fields + `PotentialCustomer` interface

### 🎨 Phase 2 — Design Templates (pure content)
- [ ] 9. Create 10 industry template JSON definitions (one per category):
  - [ ] Home & Trade Services
  - [ ] Real Estate Investment
  - [ ] Professional Services
  - [ ] Financial Vehicle
  - [ ] Retail & E-commerce
  - [ ] Health & Wellness
  - [ ] Food & Beverage
  - [ ] Creative & Marketing
  - [ ] Non-Profit
  - [ ] Unclear (fallback)
- [ ] 10. Seed `design_templates` via migration/seed script
- [ ] 11. Demo page component consumes template JSON + accent color

### ⚙️ Phase 3 — Demo Generation Pipeline (new edge function + new route)
- [ ] 12. Build `generate-demo-sites` edge function:
  - [ ] 12a. Query build-queue leads (target_fit='yes' AND site_generated=false AND NOT already_has_website)
  - [ ] 12b. Pick template by business_category
  - [ ] 12c. Generate unique AI content (batch 10–20 per invocation, loops until done)
  - [ ] 12d. Derive accent color from business name hash
  - [ ] 12e. Insert `public_demo_sites(demo_slug=document_number, lead_id, ...)`
  - [ ] 12f. Update `leads.site_generated=true`, `site_generated_at=now()`
  - [ ] 12g. Return processed/failed counts + remaining
- [ ] 13. Build `POST /api/demo/generate` trigger route (mirrors geocode one-click loop pattern)
- [ ] 14. Add "Generate Sites" button to `/admin/leads` sidebar
- [ ] 15. Test on 10 leads — verify `/demo/L26000424924` style URLs render
- [ ] 16. `tsc` clean — no existing pages break

### 📡 Phase 4 — Tracking Endpoints (new routes, additive)
- [ ] 17. `GET /api/track/open` (1×1 pixel + log `opened`)
- [ ] 18. `GET /api/track/click` (log `clicked` + redirect to demo)
- [ ] 19. `GET /api/track/scan` (log `scanned` + redirect + `?src=postcard`)
- [ ] 20. `track-outreach-2` edge function (fallback logger for guaranteed delivery)
- [ ] 21. Wire all three to set `leads.*_at` timestamps
- [ ] 22. Curl-test all three — verify events appear in `outreach_events`

### 🔐 Phase 5 — Demo Sign-Up Gate (modifies ONLY the demo page)
- [ ] 23. Update `/demo/[businessId]`:
  - [ ] 23a. Resolve lead by `demo_slug = document_number`
  - [ ] 23b. If cookie `demo_unlocked={lead.id}` → show full demo + log `viewed`
  - [ ] 23c. Else → show gate: business name + "Sign in to see your preview" + name/email form
  - [ ] 23d. On submit → `POST /api/signup` → set cookie → show demo
  - [ ] 23e. After unlock: render full 1-page demo + "Claim This Website" CTA
- [ ] 24. Build `POST /api/signup`:
  - [ ] 24a. Validate input (name, email)
  - [ ] 24b. Upsert `potential_customers` (source from `?src=email|postcard`)
  - [ ] 24c. Log `signed_up` event
  - [ ] 24d. Update `leads.signup_completed_at`, `potential_customer_at`
  - [ ] 24e. Return success + set unlock cookie
- [ ] 25. Browser test full flow: open → gate → sign up → see site → cookie persists on refresh

### 📬 Phase 6 — Outreach Sending (email + postcard)
- [ ] 26. Email flow (`send-demo-email`):
  - [ ] 26a. Email template with tracking pixel (`/api/track/open`)
  - [ ] 26b. "View Your Preview" button → `/api/track/click`
  - [ ] 26c. Send to email-channel leads after sites generated
  - [ ] 26d. Update `leads.outreach_sent_at`, log `sent`
- [ ] 27. Postcard flow (`send-postcards`):
  - [ ] 27a. QR generator encodes `/api/track/scan?lead={id}`
  - [ ] 27b. (If Lob ready) create postcard order; else generate QR image for manual print
  - [ ] 27c. Update `leads.postcard_sent`, `postcard_sent_date`, log `sent`
- [ ] 28. "Send Outreach" buttons on `/admin/leads` (email queue + postcard queue)
- [ ] 29. Test email pixel/click tracked; QR scan tracked

### 💰 Phase 7 — Potential Customers → Customers
- [ ] 30. `GET /api/potential-customers` (admin list: business, email, source, status, converted)
- [ ] 31. `/admin/potential-customers` page (table + "Mark Paid" action)
- [ ] 32. `POST /api/potential-customers/[id]/paid`:
  - [ ] 32a. Create/update `customers` row (link `lead_id`)
  - [ ] 32b. Update `potential_customers.status='paid'`, `converted_at`
  - [ ] 32c. Update `leads.converted_at`
  - [ ] 32d. Log `paid` event
- [ ] 33. `stripe-conversion-webhook` edge function (auto-convert on successful checkout)
- [ ] 34. Test manual "Mark Paid" → customer appears in `/admin/customers`

### 📊 Phase 8 — Attribution Report
- [ ] 35. `GET /api/attribution` — funnel per channel from `outreach_events`
- [ ] 36. `/admin/attribution` page:
  - [ ] 36a. Table: Sent → Opened/Scanned → Clicked/Viewed → Signed Up → Paid (per channel)
  - [ ] 36b. Conversion % per channel
  - [ ] 36c. Revenue per channel
- [ ] 37. `cron-mark-ignored` edge function (14-day non-engagers flagged)
- [ ] 38. Wire daily cron to also fire it

### 🧪 Phase 9 — Final Verification (nothing breaks)
- [ ] 39. `npx tsc --noEmit` — zero errors
- [ ] 40. Regression: leads list, map, customers, dashboard all still render
- [ ] 41. Full journey test: generate → email open → click → sign up → paid → customer
- [ ] 42. Update `PROJECT_REPORT_CHECKLIST.md` with new done items

---

## 8. RISK MITIGATION (nothing breaks)

| Risk | Mitigation |
|------|-----------|
| Migration fails | All `ADD COLUMN IF NOT EXISTS` + `CREATE TABLE IF NOT EXISTS` — additive only |
| Existing pages break | Phases 1–4 only ADD routes/tables; only Phase 5 touches the demo page |
| Edge function timeout | `generate-demo-sites` processes 10–20 per invocation + loops (same pattern as geocode) |
| Email provider missing | Phase 6 waits for decision; everything before works without sending |
| Stripe not configured | Phase 7 has manual "Mark Paid" fallback — funnel testable with zero payments |
| Old demo URLs break | `public_demo_sites` keeps existing rows; new rows use `demo_slug=document_number` |
| Duplicate QR/email sends | Track `outreach_sent_at` — never send twice to same lead |

---

## 9. OPEN DECISIONS (need input before Phase 6)

1. **Email provider** — Resend (simple/cheap), SendGrid (robust), Postmark (deliverability), or manual "send to yourself" testing first?
2. **Postcard vendor** — Lob API now, or QR images + manual print for the first test batch?
3. **Sign-up gate** — simple name + email (no verification) — recommended, confirm?
4. **1-page demo** — confirmed one page for demo; expand to 3–5 pages after payment — agreed?

---

## 10. WHAT ALREADY EXISTS (no rebuild needed)

- ✅ `public_demo_sites` table (created last session) — just use `demo_slug = document_number`
- ✅ Demo page reads `public_demo_sites` by slug — needs sign-up gate added only
- ✅ `document_number` field on leads (e.g. `L26000424924`) — stable URL basis
- ✅ Email vs postcard channel logic (`computeOutreach()` in `/api/leads`)
- ✅ Stripe checkout route (fixed last session — `payment_method_types: ["card"]`)
- ✅ DataTable with clickable sortable/filterable headers
- ✅ Geocode edge function + one-click loop pattern (reusable for generation loop)

---

*Update this file as you execute: check off items under section 7 as they're completed. This is the living plan for the next phase of the project.*