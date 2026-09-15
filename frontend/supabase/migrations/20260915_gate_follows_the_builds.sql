-- Judge sites as they are built, and stop calling an unknown agent healthy.
--
-- TWO FAULTS, both found reading today's digest.
--
-- 1. THE QUALITY GATE RAN ONCE, AFTER ONE BUILD RUN
--
-- The gate was scheduled at 11:40, forty minutes after the single 11:00 build
-- — exactly right when every site for the day was made in one burst. This
-- morning the builds were spread across 11:00 to 22:00 to stop the edge
-- runtime killing them, and nobody moved the gate. So a site built at 13:00
-- now waits until 11:40 tomorrow to be judged, and cannot be emailed until
-- then.
--
-- That is not theoretical: 17 sites are sitting at 'pending' tonight, 9 of
-- them built today, while the sender — which can do 25 a day — found 5 leads
-- due and sent 5 emails. The outreach is starved by a scheduling detail.
--
-- The gate now runs at :45 past each build hour. It is idempotent and only
-- looks at sites awaiting review, so running it twelve times instead of once
-- costs almost nothing when there is nothing to judge.
--
-- 2. agent_health() CALLED A JOB 'ok' WHEN IT HAD NO IDEA
--
-- The verdict fell through to 'ok' whenever no response row could be found,
-- on the reasoning — written into the function — that a job which has not
-- fired since agent_post was introduced is not faulty. True when written, and
-- wrong now for a different reason: pg_net DELETES from net._http_response
-- after a few hours.
--
-- So the evidence expires and the verdict silently improves. The watchdog saw
-- skip-trace-daily return 502 at 15:00 and said so. By 18:12 the response row
-- was pruned, agent_health reported last_http = null, and the verdict read
-- 'ok'. The job was still broken. Four of eleven agents were in that state.
--
-- The fix is to write the outcome down while it still exists. agent_calls
-- already records the request id at call time; it now also carries what came
-- back, swept in every five minutes, well inside the pruning window. Absence
-- of evidence is reported as 'unknown', never as health.

-- ---------------------------------------------------------------- the gate
select cron.unschedule('site-quality-gate')
where exists (select 1 from cron.job where jobname = 'site-quality-gate');

-- The command is carried over verbatim from the old schedule so the cron
-- secret is not retyped or lost; only the timing changes.
select cron.schedule('site-quality-gate', '45 11-22 * * *', :'gate_cmd');

-- ------------------------------------------------------- remembered replies
alter table public.agent_calls
  add column if not exists status_code integer,
  add column if not exists error_msg   text,
  add column if not exists body        text,
  add column if not exists settled_at  timestamptz;

comment on column public.agent_calls.status_code is
  'What the endpoint returned, copied out of net._http_response before pg_net prunes it.';

create index if not exists agent_calls_unsettled_idx
  on public.agent_calls (request_id) where settled_at is null;

/**
 * Copy finished responses into agent_calls while they still exist.
 *
 * pg_net keeps net._http_response for a few hours only. Anything not carried
 * across in that window is lost, and a lost response is what made a broken
 * job look healthy.
 */
create or replace function public.settle_agent_calls()
returns integer
language plpgsql
security definer
set search_path to ''
as $$
declare
  n integer;
begin
  with done as (
    update public.agent_calls c
    set status_code = r.status_code,
        error_msg   = nullif(r.error_msg, ''),
        body        = left(coalesce(nullif(r.error_msg, ''), r.content, ''), 200),
        settled_at  = now()
    from net._http_response r
    where r.id = c.request_id and c.settled_at is null
    returning 1
  )
  select count(*) into n from done;
  return n;
end;
$$;

select cron.unschedule('settle-agent-calls')
where exists (select 1 from cron.job where jobname = 'settle-agent-calls');

select cron.schedule('settle-agent-calls', '*/5 * * * *',
                     $job$select public.settle_agent_calls()$job$);

-- Catch whatever is still in the response table right now.
select public.settle_agent_calls();

-- ------------------------------------------------------------ honest health
create or replace function public.agent_health()
returns table(jobname text, schedule text, active boolean,
              last_run timestamptz, hours_since numeric, overdue boolean,
              never_run boolean, last_http integer, last_reply text, verdict text)
language sql
stable
security definer
set search_path to 'cron', 'net', 'public'
as $function$
  with last_run as (
    select distinct on (d.jobid) d.jobid, d.start_time
    from cron.job_run_details d order by d.jobid, d.start_time desc
  ),
  tolerance as (
    select j.jobid, j.jobname::text as jobname, j.schedule::text as schedule, j.active,
           -- Generous on purpose. A weekday job legitimately sleeps through a
           -- weekend, and an alarm every Monday teaches you to ignore the channel.
           case
             when j.schedule like '%/5 %'    then 1
             when j.schedule like '%/10%'    then 2
             when j.schedule like '%/15%'    then 2
             when j.schedule like '%1-5'     then 96
             when j.schedule like '7 13-23%' then 26
             else 30
           end as max_hours
    from cron.job j
  ),
  -- The most recent settled call this job made. Read from agent_calls, which
  -- keeps its answer, rather than from net._http_response, which does not.
  reply as (
    select t.jobid, pick.status_code, coalesce(pick.error_msg, '') as err,
           pick.body, pick.called_at, pick.seen
    from tolerance t
    left join lateral (
      select c.status_code, c.error_msg, c.body, c.called_at, true as seen
      from public.agent_calls c
      where c.jobname = t.jobname and c.settled_at is not null
      order by c.called_at desc
      limit 1
    ) pick on true
  )
  select
    t.jobname, t.schedule, t.active, l.start_time,
    round(extract(epoch from (now() - l.start_time)) / 3600.0, 1),
    (l.start_time is not null
       and now() - l.start_time > (t.max_hours || ' hours')::interval),
    (l.start_time is null),
    rp.status_code, rp.body,
    case
      when not t.active then 'paused'
      when l.start_time is null then 'never run'
      when now() - l.start_time > (t.max_hours || ' hours')::interval then 'overdue'
      when coalesce(rp.err, '') <> '' then 'request failed: ' || left(rp.err, 60)
      when rp.status_code is not null and (rp.status_code < 200 or rp.status_code >= 300)
        then 'endpoint returned ' || rp.status_code
      when rp.status_code is not null then 'ok'
      -- No answer on record. That is not health, and saying so is the whole
      -- point of this function.
      when rp.seen then 'unknown — reply not recorded'
      else 'unknown — no call recorded'
    end
  from tolerance t
  left join last_run l on l.jobid = t.jobid
  left join reply rp on rp.jobid = t.jobid
  order by
    case when not t.active then 0
         when l.start_time is not null
              and now() - l.start_time > (t.max_hours || ' hours')::interval then 1
         when coalesce(rp.err,'') <> '' then 2
         when rp.status_code is not null and (rp.status_code < 200 or rp.status_code >= 300) then 3
         when l.start_time is null then 4
         when rp.status_code is null then 5
         else 6 end,
    t.jobname;
$function$;
