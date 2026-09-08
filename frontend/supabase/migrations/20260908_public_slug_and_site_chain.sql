-- The last manual step between a generated site and a sendable one.
--
-- Producing a demo is two functions, not one:
--
--   generate-site         writes the copy onto the lead (generated_content)
--   generate-design-html  takes that copy, calls the model, validates the
--                         result, retries once on failure, uploads the HTML
--                         and writes the demo_sites row as `ready`
--
-- Both worked. Nothing ran the second one, and nothing set public_slug — the
-- address the site is actually served at. The 43 sites built in August got
-- theirs from a one-off backfill, so every site produced afterwards would have
-- been finished, stored, marked ready, and unreachable. A demo with no URL
-- cannot go in an email.
--
-- A trigger rather than another scheduled job: the slug is a property of the
-- row and should exist the moment the row does.

create or replace function public.set_public_slug()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  base      text;
  candidate text;
  n         int := 1;
begin
  if new.public_slug is not null and new.public_slug <> '' then
    return new;
  end if;

  base := public.slugify_business(new.business_name, new.city);
  if base is null or base = '' then
    -- Nothing usable in the name. The filing number is ugly but unique, and a
    -- reachable ugly URL beats an unreachable pretty one.
    base := lower(new.demo_slug);
  end if;

  -- Reserved application paths must never be taken by a business name, or the
  -- site would shadow /pricing, /admin and the rest. Kept in step with the
  -- RESERVED set in src/lib/public-site.ts.
  if base in ('admin','api','auth','claim','demo','demo-sites','leads','intake',
              'pricing','services','faq','privacy','terms','colors','site','sites',
              'login','logout','register','dashboard','account','settings','billing',
              'support','help','about','contact','blog','docs','status',
              'integrations','agents','inventory','analytics','customers',
              'bookings','emails','m','s') then
    base := base || '-fl';
  end if;

  candidate := base;
  -- Two businesses can share a name. The second gets a suffix rather than
  -- silently taking over the first one's address.
  while exists (
    select 1 from public.demo_sites
    where public_slug = candidate
      and demo_slug is distinct from new.demo_slug
  ) loop
    n := n + 1;
    candidate := base || '-' || n;
  end loop;

  new.public_slug := candidate;
  return new;
end;
$$;

drop trigger if exists demo_sites_set_public_slug on public.demo_sites;
create trigger demo_sites_set_public_slug
  before insert or update on public.demo_sites
  for each row execute function public.set_public_slug();

-- Backfill anything already stranded without an address.
update public.demo_sites set updated_at = now() where public_slug is null;

-- ---------------------------------------------------------------------------
-- The site builder, running the whole chain.
--
-- The first version called generate-site and stopped. That writes copy and
-- sets site_generated = true, which takes the lead out of the queue — so it
-- marked twenty leads done for work that produced no website. Copy is not a
-- site: it cannot be served, gated, enrolled or emailed.
--
-- A failed build must also be retryable. The first version looked for leads
-- with no demo_sites row at all, and a failure writes a row with
-- status = 'failed', so ten sites that died on an out-of-credit error would
-- never have been attempted again. Out of credit, a model timeout and a bad
-- gateway are all temporary.
-- ---------------------------------------------------------------------------
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
  built      int := 0;
begin
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

  for target in
    select l.id
    from public.leads l
    left join public.demo_sites d on d.demo_slug = l.demo_slug
    where l.generated_content is not null
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

  return format('requested copy for %s, html for %s',
                least(cap, needs_copy), built);
end;
$$;

-- 11:00 UTC, between the map placer at 10:40 and the quality gate at 11:40, so
-- a site built this morning is judged and approved this morning.
select cron.unschedule('build-sites-daily')
where exists (select 1 from cron.job where jobname = 'build-sites-daily');

select cron.schedule('build-sites-daily', '0 11 * * *',
                     $job$select public.trigger_build_sites()$job$);
