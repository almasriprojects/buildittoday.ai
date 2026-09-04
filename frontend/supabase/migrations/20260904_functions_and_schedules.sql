-- Functions and scheduled jobs, captured from the live database.
--
-- These were applied directly to Postgres and never written down, so the
-- repository stopped describing the database somewhere around 20260818.
-- Rebuilding from the migrations folder would have produced a database the
-- application could not run against: the admin console calls agent_status,
-- agent_responses, lead_breakdown and lead_filter_options by name, and the
-- classifier and map placer run on schedules that existed nowhere in git.
--
-- Every definition below was read back out of pg_get_functiondef rather than
-- retyped from memory, so it matches what is actually running.
--
-- Still not captured here: the table definitions themselves. There are 18
-- tables in public and the five older migrations cover only some of them.
-- See the note at the bottom.

-- ---------------------------------------------------------------------------
-- Column added when the lead map learned to tell a real address from a
-- postcode centre. Without it the map silently claims precision it lacks.
-- ---------------------------------------------------------------------------
alter table public.leads
  add column if not exists geo_precision text;

comment on column public.leads.geo_precision is
  '''address'' = geocoded to the door. ''zip'' = centre of the postcode, which is most of them.';

-- ---------------------------------------------------------------------------
-- Timestamp triggers
-- ---------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger language plpgsql set search_path to ''
as $function$
begin
  new.updated_at = now();
  return new;
end;
$function$;

create or replace function public.demo_media_touch_updated_at()
returns trigger language plpgsql set search_path to ''
as $function$
begin
  new.updated_at = now();
  return new;
end;
$function$;

create or replace function public.touch_app_secrets()
returns trigger language plpgsql
as $function$
begin new.updated_at = now(); return new; end
$function$;

create or replace function public.touch_customers_updated_at()
returns trigger language plpgsql
as $function$
begin new.updated_at = now(); return new; end
$function$;

-- ---------------------------------------------------------------------------
-- The public URL a generated site is served at.
--
-- Strips the legal suffix so "Sunshine Plumbing LLC" becomes
-- sunshine-plumbing — the address goes in an outreach email, and a filing
-- number told the recipient they were a record in a database.
-- ---------------------------------------------------------------------------
create or replace function public.slugify_business(name text, city text default null)
returns text language sql immutable
as $function$
  select nullif(
    trim(both '-' from
      regexp_replace(
        regexp_replace(
          regexp_replace(
            lower(
              regexp_replace(coalesce(name,''),
                '[,.]?\s*\y(llc|l\.l\.c|inc|incorporated|corp|corporation|co|company|ltd|lp|llp|pllc|pa)\y\.?\s*$',
                '', 'gi')
            ),
            '[''’]', '', 'g'          -- drop apostrophes before splitting
          ),
          '[^a-z0-9]+', '-', 'g'
        ),
        '-{2,}', '-', 'g'
      )
    ), ''
  );
$function$;

-- ---------------------------------------------------------------------------
-- Row level security is enabled on every new public table automatically,
-- so a table added in a hurry is not readable by anyone with the anon key.
-- ---------------------------------------------------------------------------
create or replace function public.rls_auto_enable()
returns event_trigger language plpgsql security definer set search_path to 'pg_catalog'
as $function$
DECLARE
  cmd record;
BEGIN
  FOR cmd IN
    SELECT *
    FROM pg_event_trigger_ddl_commands()
    WHERE command_tag IN ('CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO')
      AND object_type IN ('table','partitioned table')
  LOOP
     IF cmd.schema_name IS NOT NULL AND cmd.schema_name IN ('public') AND cmd.schema_name NOT IN ('pg_catalog','information_schema') AND cmd.schema_name NOT LIKE 'pg_toast%' AND cmd.schema_name NOT LIKE 'pg_temp%' THEN
      BEGIN
        EXECUTE format('alter table if exists %s enable row level security', cmd.object_identity);
        RAISE LOG 'rls_auto_enable: enabled RLS on %', cmd.object_identity;
      EXCEPTION
        WHEN OTHERS THEN
          RAISE LOG 'rls_auto_enable: failed to enable RLS on %', cmd.object_identity;
      END;
     ELSE
        RAISE LOG 'rls_auto_enable: skip % (either system schema or not in enforced list: %.)', cmd.object_identity, cmd.schema_name;
     END IF;
  END LOOP;
END;
$function$;

-- ---------------------------------------------------------------------------
-- Classification, only when there is something to classify. Calling the
-- edge function unconditionally would spend model tokens on an empty queue
-- every fifteen minutes.
-- ---------------------------------------------------------------------------
create or replace function public.trigger_classify_if_pending()
returns void language plpgsql security definer set search_path to ''
as $function$
declare
  pending int;
begin
  select count(*) into pending from public.leads where target_fit is null;
  if pending = 0 then
    return;
  end if;

  perform net.http_post(
    url := 'https://tftlysimqcrwjyncjvvf.supabase.co/functions/v1/classify-leads',
    headers := '{"Content-Type": "application/json"}'::jsonb,
    body := '{}'::jsonb
  );
end;
$function$;

-- ---------------------------------------------------------------------------
-- Placing new leads on the map from points already held.
--
-- Geocoding each address would mean tens of thousands of requests to a
-- service run free for the public. Nearly every new filing lands in a
-- postcode we already know a point for, so this costs nothing.
-- ---------------------------------------------------------------------------
create or replace function public.place_leads_by_zip()
returns integer language plpgsql security definer set search_path to 'public'
as $function$
declare
  placed integer;
begin
  with known as (
    select zip,
           -- Prefer real street-level points where we have them, and fall
           -- back to the postcode centre otherwise. Median rather than mean,
           -- so a single bad geocode cannot drag a centre into the sea.
           coalesce(
             percentile_cont(0.5) within group (order by latitude)
               filter (where geo_precision = 'address'),
             percentile_cont(0.5) within group (order by latitude)
           ) as lat,
           coalesce(
             percentile_cont(0.5) within group (order by longitude)
               filter (where geo_precision = 'address'),
             percentile_cont(0.5) within group (order by longitude)
           ) as lng
    from leads
    where latitude is not null and zip is not null
    group by zip
  )
  update leads l
     set latitude = k.lat, longitude = k.lng, geo_precision = 'zip'
    from known k
   where l.zip = k.zip and l.latitude is null;

  get diagnostics placed = row_count;
  return placed;
end;
$function$;

-- ---------------------------------------------------------------------------
-- What the Agents page reads.
--
-- agent_status reports what pg_cron thinks happened; agent_responses reports
-- what the endpoints actually replied. Both are needed, because pg_cron
-- records "succeeded" once a request is queued, not once it is answered —
-- a job can look perfectly healthy while its endpoint returns 500.
-- ---------------------------------------------------------------------------
create or replace function public.agent_status()
returns table (
  jobname text, schedule text, active boolean,
  last_run timestamptz, last_status text, last_duration interval,
  runs_24h bigint, failures_24h bigint
)
language sql security definer set search_path to 'cron', 'public'
as $function$
  with latest as (
    select distinct on (d.jobid) d.jobid, d.start_time, d.end_time, d.status
    from cron.job_run_details d
    order by d.jobid, d.start_time desc
  ),
  recent as (
    select d.jobid,
           count(*)                                       as runs,
           count(*) filter (where d.status <> 'succeeded') as fails
    from cron.job_run_details d
    where d.start_time > now() - interval '24 hours'
    group by d.jobid
  )
  select j.jobname::text, j.schedule::text, j.active,
         l.start_time, l.status::text, (l.end_time - l.start_time),
         coalesce(r.runs, 0), coalesce(r.fails, 0)
  from cron.job j
  left join latest l on l.jobid = j.jobid
  left join recent r on r.jobid = j.jobid
  order by j.jobname;
$function$;

create or replace function public.agent_responses(limit_n integer default 20)
returns table (id bigint, created timestamptz, status_code integer, url text, body text)
language sql security definer set search_path to 'net', 'public'
as $function$
  select r.id, r.created, r.status_code,
         coalesce(q.url, '')::text,
         left(r.content, 400)
  from net._http_response r
  left join net.http_request_queue q on q.id = r.id
  order by r.created desc
  limit least(greatest(limit_n, 1), 100);
$function$;

-- ---------------------------------------------------------------------------
-- What the Lead inventory page reads.
--
-- `dimension` is matched against a fixed list rather than interpolated into
-- SQL, so a value arriving from a query string can only ever select a column
-- named here. The browser asks for buckets instead of downloading 47,000
-- rows to count them itself.
-- ---------------------------------------------------------------------------
create or replace function public.lead_breakdown(
  dimension text default 'category',
  filter_fit text default null,
  filter_tier text default null,
  filter_category text default null
)
returns table (
  label text, email bigint, phone bigint,
  post bigint, unreachable bigint, total bigint
)
language sql stable security definer set search_path to 'public'
as $function$
  with scoped as (
    select
      case dimension
        when 'county'   then nullif(county, '')
        when 'entity'   then entity_type_name
        when 'fit'      then target_fit
        when 'tier'     then lead_tier
        when 'city'     then nullif(city, '')
        else business_category
      end as label,
      -- Reachability is a ladder, not a set of tags: email is the cheapest
      -- route, then phone, then post. Each lead counts once, in the best
      -- channel actually open to it.
      case
        when coalesce(contact_email, '') <> '' then 'email'
        when coalesce(contact_phone, '') <> '' then 'phone'
        when coalesce(full_address, '')  <> '' then 'post'
        else 'unreachable'
      end as reach
    from leads
    where (filter_fit      is null or target_fit        = filter_fit)
      and (filter_tier     is null or lead_tier         = filter_tier)
      and (filter_category is null or business_category = filter_category)
  )
  select
    coalesce(label, 'Not recorded') as label,
    count(*) filter (where reach = 'email')       as email,
    count(*) filter (where reach = 'phone')       as phone,
    count(*) filter (where reach = 'post')        as post,
    count(*) filter (where reach = 'unreachable') as unreachable,
    count(*)                                      as total
  from scoped
  group by 1
  order by 6 desc;
$function$;

-- Read from the data rather than hardcoded, so a new category from the
-- classifier appears in the filters on its own.
create or replace function public.lead_filter_options()
returns table (kind text, value text, n bigint)
language sql stable security definer set search_path to 'public'
as $function$
  select 'fit', target_fit, count(*) from leads
   where target_fit is not null group by 2
  union all
  select 'tier', lead_tier, count(*) from leads
   where lead_tier is not null group by 2
  union all
  select 'category', business_category, count(*) from leads
   where business_category is not null group by 2
  order by 1, 3 desc;
$function$;

-- ---------------------------------------------------------------------------
-- Schedules.
--
-- NOT SAFE TO RUN AS WRITTEN. The four jobs that call the site authenticate
-- with a shared secret, and that secret is deliberately not in this file —
-- this repository is on GitHub. Replace REPLACE_WITH_CRON_SECRET with the
-- value of CRON_SECRET before running any of this against a fresh database.
--
-- The live jobs already carry the real secret, so running this file against
-- the existing database would replace working jobs with ones that get a 401.
-- It is a record of what is scheduled, not something to execute casually.
--
-- Times are UTC. Eastern is UTC-4 in summer, UTC-5 in winter, so the local
-- times in the comments drift by an hour across the year.
-- ---------------------------------------------------------------------------

-- Weekdays 10:00 UTC — the state publishes the previous day's filings.
-- This one calls an edge function and needs no secret.
select cron.schedule('sunbiz-pull-daily', '0 10 * * 1-5', $job$
  select net.http_post(
    url := 'https://tftlysimqcrwjyncjvvf.supabase.co/functions/v1/sunbiz-pull',
    headers := '{"Content-Type": "application/json"}'::jsonb
  );
$job$);

-- Every 15 minutes, but only spends model tokens when something is waiting.
select cron.schedule('auto-classify-leads', '*/15 * * * *',
  $job$SELECT public.trigger_classify_if_pending();$job$);

-- 40 minutes after the scraper, so the day's new filings get placed.
select cron.schedule('place-leads-on-map', '40 10 * * 1-5',
  $job$select public.place_leads_by_zip()$job$);

select cron.schedule('site-quality-gate', '40 11 * * *', $job$
  select net.http_post(
    url     := 'https://www.buildittoday.ai/api/cron/site-gate',
    headers := jsonb_build_object(
                 'Content-Type',  'application/json',
                 'x-cron-secret', 'REPLACE_WITH_CRON_SECRET'
               ),
    body    := '{}'::jsonb
  );
$job$);

-- Hourly during working hours only — an outreach email arriving at 3am
-- reads as a machine, which is exactly what it is.
select cron.schedule('email-sequence-hourly', '7 13-23 * * *', $job$
  select net.http_post(
    url     := 'https://www.buildittoday.ai/api/email/sequence/run',
    headers := jsonb_build_object(
                 'Content-Type',  'application/json',
                 'x-cron-secret', 'REPLACE_WITH_CRON_SECRET'
               ),
    body    := '{}'::jsonb
  );
$job$);

select cron.schedule('annual-report-reminders', '5 14 * * *', $job$
  select net.http_post(
    url     := 'https://www.buildittoday.ai/api/cron/annual-reports',
    headers := jsonb_build_object(
                 'Content-Type',  'application/json',
                 'x-cron-secret', 'REPLACE_WITH_CRON_SECRET'
               ),
    body    := '{}'::jsonb
  );
$job$);

select cron.schedule('telegram-daily-digest', '0 12 * * *', $job$
  select net.http_post(
    url     := 'https://www.buildittoday.ai/api/cron/digest',
    headers := jsonb_build_object(
                 'Content-Type',  'application/json',
                 'x-cron-secret', 'REPLACE_WITH_CRON_SECRET'
               ),
    body    := '{}'::jsonb
  );
$job$);

-- ---------------------------------------------------------------------------
-- KNOWN GAP
--
-- The 18 tables in public are still only partly described by this folder.
-- app_secrets, email_sends, email_events, email_settings, email_templates,
-- email_suppressions, lead_email_state, customer_emails, customer_notes,
-- booking_requests, annual_report_reminders and demo_media were all created
-- directly against the database.
--
-- This file closes the gap for everything executable, which is the part that
-- fails loudly and silently in equal measure. The table definitions still
-- need capturing before the repository can rebuild the database from empty.
-- ---------------------------------------------------------------------------
