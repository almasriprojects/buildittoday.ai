-- Owner contact lookup, on a schedule at last.
--
-- skip-trace-leads has existed since the project started and was never given a
-- cron job. The 1,053 lookups on record were all run by hand in August, and
-- nothing has run since — which is why only 818 of 54,000 leads have an email
-- address, and why that number looked like a hard ceiling rather than a tap
-- nobody had opened.
--
-- 29,641 leads are eligible right now. At 100 a day that is a long queue, and
-- deliberately so: the cap exists to pace spending against a balance that was
-- topped up out of money the owner does not have spare. DataSkip charges only
-- on a hit — a miss costs nothing — so 100 lookups is roughly $3.30, and $25
-- lasts about eight days.
--
-- 10:50 puts it after the map placer at 10:40 and before the site builder at
-- 11:00, so a lead enriched this morning can have a site built the same
-- morning. Daily rather than weekdays: the backlog does not rest.
--
-- Routed through agent_post so the run is attributable in agent_health. When
-- the balance runs out DataSkip answers 402, the function stops rather than
-- burning through the queue, and the watchdog will now actually report it
-- against this job instead of crediting it with another job's 200.

select cron.unschedule('skip-trace-daily')
where exists (select 1 from cron.job where jobname = 'skip-trace-daily');

select cron.schedule('skip-trace-daily', '50 10 * * *', $job$
  select public.agent_post(
    'skip-trace-daily',
    'https://tftlysimqcrwjyncjvvf.supabase.co/functions/v1/skip-trace-leads',
    '{"Content-Type": "application/json"}'::jsonb,
    '{"maxLeads": 100}'::jsonb,
    300000
  )
$job$);
