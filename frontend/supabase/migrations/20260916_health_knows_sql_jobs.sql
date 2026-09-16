-- Don't cry "unknown" about a job that was never going to call anything.
--
-- agent_health was taught to say 'unknown' rather than 'ok' when it has no
-- record of what an endpoint returned, because the old version reported a
-- broken job as healthy once pg_net pruned the evidence.
--
-- But two jobs — place-leads-on-map and settle-agent-calls — are pure SQL.
-- They make no HTTP request, so they will read 'unknown' forever, and a column
-- that is permanently amber for working jobs teaches you to stop reading it.
-- That is the same disease as before wearing the opposite symptom.
--
-- A job whose command never posts anywhere is now graded on whether it ran.

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
           -- Does this job actually call an endpoint? If not, there is no HTTP
           -- outcome to have an opinion about.
           (j.command ilike '%agent_post%' or j.command ilike '%http_post%') as calls_out,
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
      -- Pure SQL: ran on schedule, called nothing, nothing to report.
      when not t.calls_out then 'ok — sql only'
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
         when rp.status_code is null and t.calls_out then 5
         else 6 end,
    t.jobname;
$function$;;
