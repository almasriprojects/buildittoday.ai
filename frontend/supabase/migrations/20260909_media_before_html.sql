-- Order the build chain around the photography.
--
-- The chain was: copy -> HTML -> gate -> email. The HTML step dressed every
-- site in category_photos, the same stock shared by every business in the
-- trade, and gave it no hero video at all — so the quality gate rejected each
-- one for "no hero video", correctly, and no automated site ever reached a
-- lead.
--
-- generate-hero-media now writes three photographs and a four-second hero clip
-- per business, and generate-design-html refuses to build without them. So the
-- chain becomes:
--
--   copy -> media (submit) -> media (collect) -> HTML -> gate -> email
--
-- Media is two steps because a clip takes about eighty seconds to render and
-- nothing should hold a connection open that long: submit orders it, collect
-- picks it up. Collect runs on its own quarter-hourly schedule rather than
-- being called from here, so a clip that is slow today is simply collected on
-- the next tick instead of being lost.

create or replace function public.trigger_build_sites()
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  cap        constant int := 10;
  needs_copy int;
  target     record;
  ordered    int := 0;
  built      int := 0;
begin
  -- 1. Copy for leads that have none.
  select count(*) into needs_copy
  from public.leads
  where target_fit = 'yes' and dataskip_checked is true
    and site_generated is not true and maps_website is null;

  if needs_copy > 0 then
    perform net.http_post(
      url     := 'https://tftlysimqcrwjyncjvvf.supabase.co/functions/v1/generate-site',
      headers := '{"Content-Type": "application/json"}'::jsonb,
      body    := jsonb_build_object('maxLeads', least(cap, needs_copy)),
      timeout_milliseconds := 600000
    );
  end if;

  -- 2. Photography and hero clip for leads that have copy but no media.
  --    Ordered before the HTML loop below so that a lead which gets its media
  --    today is built tomorrow, rather than being attempted today and failing
  --    for want of pictures.
  --
  --    "Ready" is not enough on its own. The first leads through this function
  --    were done when it made a single scene, so they carry a finished clip
  --    and one photograph — and the HTML step needs three. Left as ready they
  --    would be skipped here for having media and rejected there for not
  --    having enough of it, which is a lead stuck forever rather than a lead
  --    waiting. Ready means three photographs and a clip.
  --
  --    But the photo count only decides between leads that still NEED a site.
  --    Without the demo_sites condition below, the 43 sites built by hand in
  --    August — which have three photographs and a twelve-second hero, but
  --    predate the scenes_json field this counts — look identical to a lead
  --    with no photography at all. This function ordered a fresh set for ten
  --    of them before the condition was added, and because the filenames are
  --    the same the new files overwrote the old ones underneath live,
  --    human-approved pages. A lead whose site is ready is not waiting.
  for target in
    select l.id
    from public.leads l
    left join public.demo_media m on m.demo_slug = l.demo_slug
    left join public.demo_sites d on d.demo_slug = l.demo_slug
    where l.generated_content is not null
      and (d.demo_slug is null or d.status = 'failed')
      and (
        m.demo_slug is null
        or m.status = 'failed'
        or jsonb_array_length(coalesce(m.scenes_json->'photos', '[]'::jsonb)) < 3
      )
    order by l.updated_at
    limit cap
  loop
    perform net.http_post(
      url     := 'https://tftlysimqcrwjyncjvvf.supabase.co/functions/v1/generate-hero-media',
      headers := '{"Content-Type": "application/json"}'::jsonb,
      body    := jsonb_build_object('leadId', target.id),
      timeout_milliseconds := 600000
    );
    ordered := ordered + 1;
  end loop;

  -- 3. HTML, but only where the media is actually finished. A lead whose clip
  --    is still rendering is not a failure — it is simply built on the next
  --    run, once collect has picked the clip up.
  for target in
    select l.id
    from public.leads l
    join public.demo_media m on m.demo_slug = l.demo_slug
    left join public.demo_sites d on d.demo_slug = l.demo_slug
    where l.generated_content is not null
      and m.status = 'ready'
      and m.hero_video_url is not null
      and jsonb_array_length(coalesce(m.scenes_json->'photos', '[]'::jsonb)) >= 3
      and (d.demo_slug is null or d.status = 'failed')
    order by coalesce(d.updated_at, l.updated_at)
    limit cap
  loop
    perform net.http_post(
      url     := 'https://tftlysimqcrwjyncjvvf.supabase.co/functions/v1/generate-design-html',
      headers := '{"Content-Type": "application/json"}'::jsonb,
      body    := jsonb_build_object('leadId', target.id),
      timeout_milliseconds := 600000
    );
    built := built + 1;
  end loop;

  return format('requested copy for %s, media for %s, html for %s',
                least(cap, needs_copy), ordered, built);
end;
$$;

-- Collecting finished clips.
--
-- Every fifteen minutes rather than once a day: a clip takes about eighty
-- seconds, and a lead whose media is collected in the same hour it was ordered
-- can be built the next morning instead of the morning after. The call is
-- cheap and says nothing when there is nothing outstanding.
select cron.unschedule('collect-hero-videos')
where exists (select 1 from cron.job where jobname = 'collect-hero-videos');

select cron.schedule('collect-hero-videos', '*/15 * * * *', $job$
  select net.http_post(
    url     := 'https://tftlysimqcrwjyncjvvf.supabase.co/functions/v1/generate-hero-media',
    headers := '{"Content-Type": "application/json"}'::jsonb,
    body    := '{"collect": true}'::jsonb,
    timeout_milliseconds := 300000
  )
$job$);
