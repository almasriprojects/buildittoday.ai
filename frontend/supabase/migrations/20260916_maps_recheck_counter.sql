-- Let a business be looked for again once it has had time to exist.
--
-- maps-check-leads already wrote a recheck_date on every miss. Nothing ever
-- read it: the selector asked only for maps_checked = false, so a lead was
-- searched for once, on the day it was registered, and never again.
--
-- The cost of that is measurable. Split by how old the business was when we
-- looked:
--
--   checked 0-30 days after filing   21,870 leads    0.06% found
--   checked 31-45 days                11,948 leads    9.32% found
--   checked 46-60 days                   221 leads   11.31% found
--
-- A company cannot have a Google listing before it opens, and we were asking
-- on day one. 21,870 leads are marked "not found" for that reason alone.
--
-- A counter is added so rechecking cannot run forever: three attempts and the
-- lead is left alone, which bounds the Places quota this can ever consume.

alter table public.leads
  add column if not exists maps_check_count integer not null default 0;

comment on column public.leads.maps_check_count is
  'How many times Google Places has been searched for this business. Capped at 3 by maps-check-leads so a permanently unlisted business cannot consume quota forever.';

-- Everything already searched has had exactly one look.
update public.leads set maps_check_count = 1 where maps_checked and maps_check_count = 0;

-- Bring the existing misses back into the queue, dated from when the business
-- could realistically be listed rather than fourteen days from whenever we
-- happened to ask.
update public.leads
set recheck_date = greatest(filing_date + 45, current_date)
where maps_checked
  and found_on_maps is not true
  and filing_date is not null
  and maps_check_count < 3;

create index if not exists leads_maps_recheck_idx
  on public.leads (recheck_date)
  where maps_checked and found_on_maps is not true;;
