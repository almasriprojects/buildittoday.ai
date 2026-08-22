# autosite.ai / BuildItToday.ai — Project Status Report

*Generated 2026-08-14 from a full audit of the codebase against the 8 planning docs in `Project Files/` and the 3 root `implementation_plan*.md` files.*

---

## 1. What this project is supposed to be

Per the planning docs, **BuildItToday.ai** is meant to be a fully automated website-generation and hosting business for small businesses:

1. Scrape newly-registered Florida LLCs (SunBiz → Google Maps enrichment)
2. Auto-generate a demo website per business using the Claude API
3. Mail a physical postcard (via Lob) with a QR code linking to `buildittoday.ai/demo/[businessId]`
4. Convert 5–8% of recipients into paying customers ($1,500 setup + $50/month hosting)
5. Scale toward ~$500K/year in year two, run solo with heavy automation (n8n, Supabase, Stripe)

The docs describe a 3-phase rollout: **Phase 1** manual/Vercel MVP → **Phase 2** Hetzner VPS + Docker managed hosting → **Phase 3** a fully AI-orchestrated pipeline with no human intervention.

## 2. What was planned (architecture on paper)

- **Frontend:** Next.js 15 App Router — marketing pages, `/demo/[businessId]`, `/admin/*` (dashboard, customers, campaigns, analytics, billing), `/customer/*` portal, role-based auth middleware.
- **Backend:** Next.js API routes — auth, checkout, generate (Claude), customers, postcards, analytics, billing, Stripe/Lob webhooks.
- **Database (Supabase):** 13 tables — `users`, `customers`, `deployments`, `html_templates`, `competitor_analysis`, `postcards`, `campaigns`, `page_analytics`, `form_submissions`, `invoices`, `change_requests`, `design_systems`, `monitoring_logs`.
- **Integrations:** Supabase Auth + Postgres, Stripe (payments/webhooks), Lob (postcards), Anthropic/Claude API (site generation), later Hetzner + Docker + Nginx + Let's Encrypt.

## 3. What actually exists in code today

**Pages built:** `/`, `/colors`, `/demo`, `/demo/[businessId]`, `/faq`, `/intake`, `/pricing`, `/services`, `/auth/login`, `/auth/register`, `/admin` (dashboard only).
**Missing pages:** `/admin/customers`, `/admin/campaigns`, `/admin/analytics`, `/admin/billing`, all of `/customer/*`.

**API routes:**
| Route | Status |
|---|---|
| `api/auth/login`, `api/auth/register` | Real — calls Supabase Auth |
| `api/customers` | Real — queries/inserts a `customers` table |
| `api/checkout` | **Stub** — Stripe code commented out, returns a fake `mockPaymentUrl` |
| `api/generate` | **Stub** — no Claude call, returns fake `deploymentId`/progress via `Math.random()` |

**Backend directory (`backend/`) is completely empty (0 files).** Nothing described as a separate backend service exists as code — everything lives in the Next.js API routes above.

**No database migrations or SQL anywhere.** The 13-table schema is spec-only; nothing in the repo creates it.

**No Stripe or Anthropic/Claude SDK** in `package.json` or imported anywhere — despite Claude generation being the core product idea.

## 4. What's broken

- **Site-wide styling break (biggest issue):** `tailwind.config.ts` and `globals.css` only define custom tokens (`bg-page`, `accent-primary`, …) — they never define the standard shadcn tokens (`primary`, `background`, `card`, `muted`, `input`, `ring`, `destructive`, etc.). But `components/ui/button.tsx`, `card.tsx`, `input.tsx`, and most pages (admin, auth, demo, faq, pricing, services) all use classes like `bg-primary`, `text-muted-foreground`, `bg-card`, `border-input`. Since those tokens were never declared, Tailwind compiles them to nothing — **buttons, cards, and inputs across roughly half the site render with no styling.** (The correct token set exists in the standalone `shadcn_design_studio.html` prototype but was never ported into the real app.)
- **Login/register forms don't call their own working API routes.** `auth/login/page.tsx` and `auth/register/page.tsx` just `setTimeout` and redirect to `/admin`, with `// TODO: Implement actual auth with Supabase`. The real `/api/auth/*` endpoints exist but are orphaned.
- **No `.env`/`.env.local` file exists** — only `.env.example`. Any code path touching Supabase, Stripe, or Claude will fail immediately since the app currently has no real credentials configured.
- **Admin dashboard is 100% hardcoded mock data**, and 6 of its links point to admin sub-pages that don't exist (`/admin/customers/new`, `/admin/campaigns/new`, `/admin/analytics`, etc.) — all dead links.
- **Demo business page** (`demo/[businessId]/page.tsx`) uses a hardcoded 2-entry object instead of querying Supabase.
- A stray, empty duplicate folder `frontend ` (trailing space in the name) sits at the project root — harmless but likely accidental.

## 5. What's incomplete / not started

- No Stripe integration (payments, webhooks)
- No Lob integration (postcards)
- No Claude/Anthropic integration (the actual site-generation engine — the core of the product)
- No customer portal (`/customer/*`)
- No admin sub-pages (customers, campaigns, analytics, billing)
- No auth middleware / route protection
- No database schema actually applied to Supabase (tables are spec-only)
- No scraping pipeline (SunBiz/Google Maps), no n8n workflows, no Hetzner/Docker deployment tooling

## 6. Notable drift worth flagging directly

The **real homepage content has drifted away from the BuildItToday.ai concept** described in all 8 planning docs. `components/main/*` now builds a generic web-design-agency landing page modeled on "Red River Web Design," including a fictional founder bio ("Hi, I'm Ethan... Kentucky... West Palm Beach") and a different service lineup (SEO/AEO, CRO, $2,500 "automation modules," a "$20,000 Full Stack Web App" package). None of this matches the postcard → auto-generated-demo → $1,500+$50/mo business the docs describe. Worth deciding explicitly whether the product pivoted, or whether this page needs to be reverted/reconciled with the original plan.

The three root `implementation_plan*.md` files are sequential UI-only task lists (theme picker → 10-step process section → full homepage rebuild), dated the same day, and don't reference postcards/Supabase/Claude/Lob at all — they document the drift above rather than the original architecture.

The four standalone HTML files at the project root (`complete_design_studio.html`, `shadcn_design_studio.html`, `shadcn_master_studio.html`, `theme_studio.html`) are static design-tool prototypes, superseded by the real `/colors` and `/intake` pages in the app — not part of the running product.

---

## Bottom line

What exists today is a **frontend UI shell with two real Supabase-backed API routes** (auth, customers), sitting inside a Next.js app whose styling is broken for standard components, whose auth UI doesn't call its own backend, and whose homepage no longer matches the product described in any planning doc. The actual product engine — Claude-based site generation, Stripe billing, Lob postcards, the scraping pipeline, and the entire `backend/` service — has not been started. Nothing can run end-to-end today because there's no `.env` file with real credentials, and even with one, generation and checkout are hardcoded mocks.
