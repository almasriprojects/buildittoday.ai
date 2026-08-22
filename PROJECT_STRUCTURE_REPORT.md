# 🏗️ Project Structure Report — What Exists vs What Should Exist

*Generated 2026-08-17 from live code inspection.*

---

## 1. CURRENT STRUCTURE

```
autosite.ai/
├── backend/                          ← EMPTY (placeholder, 0 files)
├── frontend/
│   ├── src/app/
│   │   ├── page.tsx                  ← Homepage (agency-style)
│   │   ├── admin/                    ← dashboard, customers, campaigns, analytics, billing, settings, leads, leads/map
│   │   ├── api/                      ← 12 routes (auth, customers, leads ×6, checkout, generate)
│   │   ├── auth/                     ← login / register
│   │   ├── colors/                   ← theme showcase
│   │   ├── demo/[businessId]/        ← dynamic demo pages
│   │   ├── faq/ pricing/ services/ intake/
│   ├── src/components/               ← UI, admin, main, sections, theme, intake
│   ├── src/lib/                      ← supabase, themes, palette, mock-data, site-data, types, utils
│   ├── src/middleware.ts             ← auth route protection
│   ├── supabase/functions/geocode-leads/  ← edge function (deployed ✅)
│   ├── supabase/migrations/          ← coordinate + public_demo_sites migrations
│   └── scripts/create-admin.ts
├── Project Files/*.md                ← 8 planning docs
├── PROJECT_REPORT_CHECKLIST.md       ← report (this session)
├── BACKEND_FRONTEND_REPORT.md        ← report (this session)
├── PROJECT_STRUCTURE_REPORT.md       ← this file
├── implementation_plan*.md           ← 3 theme/homepage plans
├── PROJECT_STATUS_REPORT.md
└── *.html                            ← 4 design prototypes
```

---

## 2. WHAT SHOULD THE STRUCTURE LOOK LIKE

```
autosite.ai/
├── frontend/                          ← The app (deploys to Vercel) — KEEP AS IS
│   ├── src/app/                       ← pages + API routes (correct)
│   ├── src/components/ lib/ middleware.ts
│   ├── supabase/                      ← edge functions + migrations (correct)
│   └── scripts/
│
├── backend/                           ← FUTURE Phase 2/3 (Docker, orchestrator, workers)
│   ├── docker/                        ← Dockerfiles + docker-compose (future)
│   ├── orchestrator/                  ← AI pipeline agent (future)
│   └── workers/                       ← scraping/enrichment workers (future)
│
├── docs/                              ← ALL documentation consolidated
│   ├── planning/                      ← Project Files/*.md (8 docs)
│   ├── implementation/                ← implementation_plan*.md (3 docs)
│   └── reports/                       ← PROJECT_STATUS_REPORT, PROJECT_REPORT_CHECKLIST, BACKEND_FRONTEND_REPORT, PROJECT_STRUCTURE_REPORT
│
├── archive/                           ← Superseded prototypes
│   └── *.html                         ← 4 design studios (no longer product code)
│
└── vercel.json / package.json ...     ← root config (if monorepo)
```

---

## 3. WHAT SHOULD MOVE / BE CLEANED

| Item | Current | Should Be | Action |
|------|---------|-----------|--------|
| `backend/` (empty) | root | `backend/` (for future) | Keep as placeholder OR delete — no code depends on it |
| 4 `.html` prototypes | root | `archive/` | Move out of root (not product code) |
| 8 planning docs | `Project Files/` | `docs/planning/` | Optional reorganization |
| 3 implementation plans | root | `docs/implementation/` | Optional reorganization |
| 2-3 reports (new) | root | `docs/reports/` | Optional reorganization |

**NOTHING under `frontend/` should move.** The API routes, edge function, and migrations are all correctly placed.

---

## 4. BROKEN CODE (verified)

| # | File | Issue | Severity |
|---|------|-------|----------|
| 1 | `frontend/src/app/api/checkout/route.ts` | Fixed this session: `managed_payments` (invalid) → `payment_method_types: ["card"]` | 🟢 Fixed |
| 2 | `frontend/src/app/api/generate/route.ts` | STUB — returns `Math.random()` deploymentId + hardcoded progress. No Claude SDK. | 🔴 High |
| 3 | `frontend/src/app/demo/[businessId]/page.tsx` | Reads `public_demo_sites` table — migration added this session so it can work | 🟢 Fixed (migration added) |
| 4 | `frontend/src/app/admin/settings/page.tsx` | `Label` errors fixed this session | 🟢 Fixed |
| 5 | `frontend/supabase/functions/geocode-leads/index.ts` | Deno type errors fixed via `deno.d.ts` | 🟢 Fixed |
| 6 | `frontend/src/app/globals.css` | `@tailwind` warnings silenced via `.vscode/settings.json` | 🟢 Fixed |

---

## 5. SUMMARY VERDICT

| Category | Verdict |
|----------|---------|
| Frontend structure | ✅ Correct (Next.js standard) |
| Backend-like code placement | ✅ Correct (API routes + edge function belong in `frontend/`) |
| `backend/` folder | ⚠️ Empty placeholder — keep for future or delete |
| Root clutter (HTML prototypes) | 🧹 Move to `archive/` |
| Broken code | 🔴 1 remaining real issue (generate stub) |
| Docs scattered | 🧹 Optional `docs/` consolidation |

---

## 6. REMAINING ACTION ITEMS

- [ ] Wire real Claude API in `/api/generate` (or mark clearly as stub + roadmap)
- [ ] Add `STRIPE_SECRET_KEY` to `.env.example`
- [ ] Apply `public_demo_sites` migration to Supabase (via CLI or SQL editor)
- [ ] Optionally move 4 HTML prototypes to `archive/`
- [ ] Optionally consolidate docs into `docs/`