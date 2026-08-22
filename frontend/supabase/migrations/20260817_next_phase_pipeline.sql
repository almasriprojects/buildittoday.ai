-- NEXT PHASE PIPELINE — Database Foundation
-- Cleaned 2026-08-18: removed design_templates (superseded by structured
-- design tokens on category_design_references) and the public_demo_sites
-- ALTER TABLE block (public_demo_sites is a VIEW, not a table — see
-- 20260815005358_replace_security_definer_view_with_rls_and_grants).
-- ADDITIVE ONLY: every statement is `ADD COLUMN IF NOT EXISTS` or
-- `CREATE TABLE IF NOT EXISTS`. No existing tables or data are modified.
--
-- Journey: Lead → Demo Site → Outreach (email/postcard) → Potential Customer → Customer
-- Attribution: every step logged in outreach_events.

-- ============================================================
-- leads — new outreach/attribution columns
-- ============================================================
alter table public.leads add column if not exists outreach_sent_at      timestamptz;
alter table public.leads add column if not exists email_opened_at       timestamptz;
alter table public.leads add column if not exists email_clicked_at      timestamptz;
alter table public.leads add column if not exists qr_scanned_at         timestamptz;
alter table public.leads add column if not exists demo_viewed_at        timestamptz;
alter table public.leads add column if not exists signup_completed_at   timestamptz;
alter table public.leads add column if not exists potential_customer_at timestamptz;
alter table public.leads add column if not exists converted_at          timestamptz;
alter table public.leads add column if not exists acquisition_channel   text; -- 'email' | 'postcard'

-- ============================================================
-- potential_customers — the middle stage between lead & customer
-- Written only by service-role API routes (/api/signup). No anon/authenticated
-- access — this holds visitor emails/names, same sensitivity bar as leads PII.
-- ============================================================
create table if not exists public.potential_customers (
  id            uuid primary key default gen_random_uuid(),
  lead_id       uuid references public.leads(id) on delete cascade,
  demo_slug     text,
  email         text,
  full_name     text,
  source        text,                        -- 'email' | 'postcard'
  status        text default 'new',           -- 'new' | 'paid' | 'lost'
  converted_at  timestamptz,
  created_at    timestamptz default now()
);

alter table public.potential_customers enable row level security;

create index if not exists idx_potential_customers_lead_id on public.potential_customers(lead_id);
create index if not exists idx_potential_customers_status on public.potential_customers(status);

-- ============================================================
-- outreach_events — THE attribution log (most important)
-- Same access model as potential_customers: service-role only.
-- ============================================================
create table if not exists public.outreach_events (
  id           uuid primary key default gen_random_uuid(),
  lead_id      uuid references public.leads(id) on delete cascade,
  channel      text,   -- 'email' | 'postcard'
  event_type   text,   -- 'sent' | 'opened' | 'clicked' | 'scanned' | 'viewed' | 'signed_up' | 'paid'
  occurred_at  timestamptz default now()
);

alter table public.outreach_events enable row level security;

create index if not exists idx_outreach_events_lead_id on public.outreach_events(lead_id);
create index if not exists idx_outreach_events_channel on public.outreach_events(channel);
create index if not exists idx_outreach_events_event_type on public.outreach_events(event_type);

-- Attribution query (powers the /admin/attribution report):
--   SELECT channel, event_type, COUNT(*) FROM outreach_events GROUP BY channel, event_type;
