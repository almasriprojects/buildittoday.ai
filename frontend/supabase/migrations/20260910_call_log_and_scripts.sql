-- Phone calls: the one channel that has never been tried.
--
-- 63 sites are built, 52 are approved, and 49 of those belong to businesses
-- with a phone number. Not one has been called. Email has produced 0 sales
-- from 47 sends, and with the buy button broken for most of that window there
-- is no way to read that as a verdict on the price.
--
-- A call answers what an email cannot: not whether they opened it, but what
-- they said. That is the only route to a conversion rate that means anything,
-- and it costs nothing to run.

create table if not exists public.call_attempts (
  id           uuid primary key default gen_random_uuid(),
  lead_id      uuid not null references public.leads(id) on delete cascade,
  called_at    timestamptz not null default now(),
  -- What actually happened. 'no_answer' and 'wrong_number' are deliberately
  -- separate: one is worth trying again, the other never is.
  outcome      text not null check (outcome in (
                 'no_answer','wrong_number','not_interested',
                 'call_back','interested','sold'
               )),
  -- What they said, in their words. The most valuable column here — it is the
  -- only place the real objection to the price gets written down.
  notes        text,
  -- What was quoted, when a number came up. Pricing is a live question and
  -- every call is a data point on it.
  quoted_setup   numeric(10,2),
  quoted_monthly numeric(10,2),
  created_at   timestamptz not null default now()
);

create index if not exists call_attempts_lead_idx on public.call_attempts(lead_id, called_at desc);
create index if not exists call_attempts_outcome_idx on public.call_attempts(outcome, called_at desc);

-- The script is generated once per lead and kept.
--
-- Regenerating on every page view would spend model credit on nothing: the
-- business's content does not change between one look and the next, and the
-- balance is $4.49.
create table if not exists public.call_scripts (
  lead_id      uuid primary key references public.leads(id) on delete cascade,
  script_json  jsonb not null,
  model        text,
  cost_usd     numeric(10,5) default 0,
  generated_at timestamptz not null default now()
);

alter table public.call_attempts enable row level security;
alter table public.call_scripts  enable row level security;

-- No policies: these are reached only through the service role, from
-- admin-gated API routes. RLS on with no policy denies everything else, which
-- is the intent — this table holds phone numbers and what people said.
