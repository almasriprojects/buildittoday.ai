-- Stop counting our own browsing as customer interest.
--
-- outreach_events records a visit to a demo site whoever is visiting. Opening
-- a site from the admin panel to check it looks right writes the same 'viewed'
-- row a business owner would, and clicking through the offer layer to test it
-- writes the same 'offer_clicked:starter'. The only guard was ?admin=1, which
-- is not on the URL when you just open the site.
--
-- What that produced, measured against when each lead was actually emailed:
--
--   88 views       71 on leads that had not been emailed yet
--    6 offer clicks   all six before that business was ever emailed
--    2 signed_up      both before, one of them three weeks before
--
-- Omegashirts "clicked the $750 offer" at 03:56 and was first emailed at
-- 13:07. Lange Marine "signed up" on 18 August and was first emailed on
-- 9 September. Every one of those read as a hot lead on the dashboard.
--
-- The rule that separates them is simple and needs no cookie or IP: a visitor
-- event on a lead that has never been sent a real email cannot have come from
-- a real recipient, because nobody outside this office has the link.
--
-- It is a trigger rather than a check in each route because there are already
-- two writers (the site itself and /api/track/offer) and this project's whole
-- failure history is one writer forgetting. A writer that knows better can
-- still set the column itself; the trigger only fills in a null.

alter table public.outreach_events
  add column if not exists is_internal boolean;

comment on column public.outreach_events.is_internal is
  'True when the event came from us rather than a prospect — set by trigger when the lead had no real email send before the event.';

create or replace function public.mark_internal_outreach_event()
returns trigger
language plpgsql
security definer
set search_path to ''
as $$
begin
  -- Only visitor events. 'sent' and 'bounced' are written by the sender
  -- itself, sometimes before the email_sends row lands, and are never
  -- somebody browsing.
  if new.is_internal is null
     and (new.event_type in ('viewed', 'clicked', 'signed_up')
          or new.event_type like 'offer\_%') then
    new.is_internal := not exists (
      select 1 from public.email_sends s
      where s.lead_id = new.lead_id
        and s.was_test is not true
        and s.sent_at <= coalesce(new.occurred_at, now())
    );
  end if;
  return new;
end;
$$;

drop trigger if exists mark_internal_outreach_event on public.outreach_events;
create trigger mark_internal_outreach_event
  before insert on public.outreach_events
  for each row execute function public.mark_internal_outreach_event();

-- Backfill by the same rule, so the history stops reading as interest too.
update public.outreach_events e
set is_internal = not exists (
  select 1 from public.email_sends s
  where s.lead_id = e.lead_id
    and s.was_test is not true
    and s.sent_at <= e.occurred_at
)
where e.is_internal is null
  and (e.event_type in ('viewed', 'clicked', 'signed_up')
       or e.event_type like 'offer\_%');

-- Everything else — sent, bounced, unsubscribed — is ours by definition and
-- was never in question.
update public.outreach_events set is_internal = false where is_internal is null;

create index if not exists outreach_events_real_idx
  on public.outreach_events (event_type, occurred_at)
  where is_internal is false;
