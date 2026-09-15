-- Build the day's sites as a drip, and let a killed build be retried.
--
-- Two faults, one symptom: the cap was raised to twenty and six sites got
-- built.
--
-- The first is a stampede. trigger_build_sites() fired every outstanding job
-- at once through pg_net — up to twenty generate-hero-media and twenty
-- generate-design-html calls in the same second, each an edge worker holding
-- a model response for two minutes. The runtime answered with
-- WORKER_RESOURCE_LIMIT (546) and killed whatever it had to. Raising the cap
-- did not raise throughput, it just made the pile-up bigger.
--
-- The second is that a killed build is invisible forever. The HTML builder
-- claims its row as 'generating' before it calls the model, and every failure
-- it can see writes 'failed'. Being killed is the one failure it cannot see:
-- the worker dies mid-call and the row stays 'generating'. The retry selector
-- only looks for rows that are missing or 'failed', so those leads are never
-- attempted again. Eleven of them had been sitting there, four days at the
-- worst, with no storage path and no error.
--
-- So: a few jobs per run, many runs, and a 'generating' row that has not been
-- touched in twenty minutes is treated as abandoned. That staleness rule is
-- also the lock — a build claims its row on the way in, which keeps the next
-- run off it, and no build has ever taken more than about two minutes.

create or replace function public.trigger_build_sites()
returns text
language plpgsql
security definer
set search_path to ''
as $function$
declare
  -- How many edge workers this run is willing to have in flight. Each one
  -- holds a model response for up to two minutes, and the runtime starts
  -- killing them well before twenty.
  fan_out    constant int := 3;
  -- The day's target. Reached in drips rather than in one burst.
  daily_cap  constant int := 20;
  -- After this long, a claimed build is presumed dead rather than working.
  stale      constant interval := interval '20 minutes';

  built      int;
  inflight   int;
  remaining  int;
  backlog    int;
  needs_copy int;
  ordered    int := 0;
  drawn      int := 0;
  requested  int := 0;
  target     record;
  fn         constant text := 'https://tftlysimqcrwjyncjvvf.supabase.co/functions/v1/';
  hdr        constant jsonb := '{"Content-Type": "application/json"}'::jsonb;
begin
  select count(*) into built
  from public.demo_sites
  where status = 'ready' and updated_at >= date_trunc('day', now());

  -- A build that is genuinely under way will land shortly, so it spends from
  -- today's budget even though it has not finished yet.
  select count(*) into inflight
  from public.demo_sites
  where status = 'generating' and updated_at > now() - stale;

  remaining := daily_cap - built - inflight;
  if remaining <= 0 then
    return format('%s built today, %s in flight — nothing more today', built, inflight);
  end if;

  -- Copy first, but only enough to keep the builders fed. Asking for twenty
  -- leads' worth of copy on every run would write copy for hundreds of
  -- businesses a day and build sites for twenty of them.
  select count(*) into backlog
  from public.leads l
  left join public.demo_sites d on d.demo_slug = l.demo_slug
  where l.generated_content is not null
    and (d.demo_slug is null or d.status <> 'ready');

  if backlog < remaining then
    select count(*) into needs_copy
    from public.leads
    where target_fit = 'yes' and dataskip_checked is true
      and site_generated is not true and maps_website is null;

    if needs_copy > 0 then
      requested := least(remaining - backlog, needs_copy);
      perform public.agent_post(
        'build-sites-daily', fn || 'generate-site', hdr,
        jsonb_build_object('maxLeads', requested), 600000);
    end if;
  end if;

  -- Photographs and the hero clip.
  for target in
    select l.id
    from public.leads l
    left join public.demo_media m on m.demo_slug = l.demo_slug
    left join public.demo_sites d on d.demo_slug = l.demo_slug
    where l.generated_content is not null
      and (
        d.demo_slug is null
        or d.status = 'failed'
        or (d.status = 'generating' and d.updated_at < now() - stale)
      )
      and (
        m.demo_slug is null
        or m.status = 'failed'
        or jsonb_array_length(coalesce(m.scenes_json->'photos', '[]'::jsonb)) < 3
      )
    order by l.updated_at
    limit least(fan_out, remaining)
  loop
    perform public.agent_post(
      'build-sites-daily', fn || 'generate-hero-media', hdr,
      jsonb_build_object('leadId', target.id), 600000);
    ordered := ordered + 1;
  end loop;

  -- The page itself, for leads whose media is finished.
  for target in
    select l.id
    from public.leads l
    join public.demo_media m on m.demo_slug = l.demo_slug
    left join public.demo_sites d on d.demo_slug = l.demo_slug
    where l.generated_content is not null
      and m.status = 'ready'
      and m.hero_video_url is not null
      and jsonb_array_length(coalesce(m.scenes_json->'photos', '[]'::jsonb)) >= 3
      and (
        d.demo_slug is null
        or d.status = 'failed'
        or (d.status = 'generating' and d.updated_at < now() - stale)
      )
    order by coalesce(d.updated_at, l.updated_at)
    limit least(fan_out, remaining)
  loop
    perform public.agent_post(
      'build-sites-daily', fn || 'generate-design-html', hdr,
      jsonb_build_object('leadId', target.id), 600000);
    drawn := drawn + 1;
  end loop;

  return format(
    '%s built today, %s in flight, %s left — asked for %s copy, %s media, %s html',
    built, inflight, remaining, requested, ordered, drawn);
end;
$function$;

-- Every ten minutes from 11:00 UTC, which is where the single daily run used
-- to be, until 22:50. The daily cap inside the function is what actually
-- stops the day's work; the window just keeps it clear of the overnight jobs.
select cron.unschedule('build-sites-daily')
where exists (select 1 from cron.job where jobname = 'build-sites-daily');

select cron.schedule('build-sites-daily', '*/10 11-22 * * *',
                     $job$select public.trigger_build_sites()$job$);
