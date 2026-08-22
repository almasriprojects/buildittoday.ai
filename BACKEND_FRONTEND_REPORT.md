# 📊 Backend vs Frontend — Architecture Report

*Generated 2026-08-17. Explains where backend code lives, why it's in `frontend/`, and when a separate `backend/` folder would be needed.*

---

## TL;DR

**The code is correctly placed where it is.** Next.js API routes *must* live in `frontend/src/app/api/*`, and Supabase edge functions *must* live in `frontend/supabase/functions/*`. The `backend/` folder at the project root is **empty** — a leftover placeholder from the original planning docs. There is nothing to move.

---

## 1. Current Project Layout

```
autosite.ai/
├── backend/                     ← EMPTY (0 files, placeholder only)
├── frontend/                    ← Everything lives here (correct)
│   ├── src/app/api/*            ← BACKEND routes (server-only)
│   ├── src/app/*                ← FRONTEND pages (UI)
│   ├── src/components/*         ← FRONTEND components
│   ├── src/lib/*                ← Shared helpers
│   ├── supabase/functions/*     ← SUPABASE edge functions (deployed to Supabase)
│   └── supabase/migrations/*    ← DB migrations (applied to Supabase)
└── Project Files/*              ← Planning docs
```

---

## 2. Backend-Like Code Currently Under `frontend/` — All Correctly Placed

### Next.js API Routes (`frontend/src/app/api/`) — these ARE the backend
| Route | Purpose | Server-only? |
|-------|---------|--------------|
| `auth/login/route.ts` | Login → Supabase Auth | ✅ |
| `auth/logout/route.ts` | Logout | ✅ |
| `auth/register/route.ts` | Register → Supabase Auth | ✅ |
| `customers/route.ts` | Customers CRUD → Supabase | ✅ |
| `leads/route.ts` | Leads list/pagination | ✅ |
| `leads/[leadId]/route.ts` | Single lead detail | ✅ |
| `leads/cron/route.ts` | Daily pipeline trigger (Vercel Cron) | ✅ |
| `leads/process/route.ts` | Pipeline dispatcher (fires edge functions) | ✅ |
| `leads/geocode/route.ts` | Geocode batch (alternative route) | ✅ |
| `leads/map/route.ts` | Map coordinates payload | ✅ |
| `checkout/route.ts` | Stripe checkout (currently a stub) | ✅ |
| `generate/route.ts` | Site generation (currently a stub) | ✅ |

### Supabase Edge Function & Migrations (`frontend/supabase/`)
| Path | Purpose | Must stay here? |
|------|---------|-----------------|
| `functions/geocode-leads/index.ts` | Geocoding worker (deployed to Supabase) | ✅ Yes — Supabase CLI expects `supabase/functions/` |
| `functions/deno.d.ts` | Type declarations for the edge function | ✅ Yes |
| `migrations/20260816_add_lead_coordinates.sql` | `latitude`/`longitude` columns | ✅ Yes — Supabase CLI expects `supabase/migrations/` |

### Other Backend Helpers
| Path | Purpose |
|------|---------|
| `src/lib/supabase.ts` | Supabase client (service-role + anon) |
| `src/lib/geocode.ts` | Geocoding helpers/cache |
| `scripts/create-admin.ts` | Admin creation script (run via CLI) |

---

## 3. Why Next.js API Routes Live Inside the Frontend

Next.js App Router **requires** server routes to be colocated in `src/app/api/`. When you deploy to Vercel:

1. The whole `frontend/` folder compiles into one serverless app
2. `src/app/api/*` routes become serverless functions (never shipped to the browser)
3. Pages call these same-origin routes with no CORS issues
4. Everything deploys together with `vercel.json`

**Moving them to `backend/` would break routing entirely.** The routes wouldn't exist at `/api/*`, and you'd need a separate deployment, CORS config, and local tunnel just to make the frontend talk to them — for zero benefit at this stage.

---

## 4. Why the Edge Function Lives in `frontend/supabase/functions/`

The Supabase CLI (`supabase functions deploy`) scans a project for `supabase/functions/*` relative to its config. The functions folder globally lives **inside `frontend/`** for this repo, so `supabase` CLI commands run from `frontend/` correctly find and deploy `geocode-leads`.

**It is already deployed and verified working** (50/50 success × 4 runs) — exactly where Supabase expects it.

---

## 5. When Would a Separate `backend/` Actually Make Sense?

Per the planning docs (`buildittoday-architecture-deep-dive.md`, phase 2/3), you'd create real backend services **when**:

| Scenario | What would live in `backend/` |
|----------|-------------------------------|
| Phase 2: Hetzner VPS + Docker hosting | Deploy scripts, Dockerfiles, Nginx configs |
| Phase 3: Full AI orchestration | A dedicated orchestrator service (separate from Next.js) |
| n8n workflows | n8n config + Python/Node scraping workers |
| Public API for 3rd parties | A standalone API server |

These would be **new code**, not moved code. Nothing that exists today should move.

---

## 6. Recommendation

| Action | Verdict |
|--------|---------|
| Move `src/app/api/*` to `backend/` | ❌ No — breaks Next.js |
| Move `supabase/functions/*` to `backend/` | ❌ No — breaks Supabase deploy |
| Delete empty `backend/` folder | ✅ Optional (it's a placeholder with no files) |
| Keep everything as-is | ✅ **Recommended** |

---

*If you want, the empty `backend/` folder can be deleted, or left in place as a placeholder for future Phase 2 work. No functional code depends on it.*