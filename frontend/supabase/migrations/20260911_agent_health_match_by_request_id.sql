-- Make the health check report the job it is actually looking at.
--
-- agent_health() matched a job to an HTTP response by time alone: the first
-- row in net._http_response within three minutes of the job starting, with
-- nothing tying that response to that job. auto-classify-leads and
-- collect-hero-videos both run on */15 and fire in the same second, so
-- whichever replied first was credited to both.
--
-- The classifier 502'd every fifteen minutes for a day while the board showed
-- it green with the collector's 200 beside it, and the Telegram watchdog never
-- fired. A monitor that reports the wrong job's result is worse than no
-- monitor, because it is trusted.
--
-- It cannot be fixed by joining after the fact: pg_net deletes the queue row
-- (which holds the URL) once a request completes, so by the time a response
-- exists there is nothing left to say what was called. The id has to be
-- recorded at call time instead.
--
-- The companion migration repoints every scheduled job at agent_post. It reads
-- the cron secret out of the existing job definitions rather than embedding it,
-- so the secret stays out of this repository.

create table if not exists public.agent_calls (
  request_id bigint primary key,
  jobname    text not null,
  url        text not null,
  called_at  timestamptz not null default now()
);

create index if not exists agent_calls_job_idx on public.agent_calls(jobname, called_at desc);
alter table public.agent_calls enable row level security;

-- net.http_post, with a note of who made the call.
create or replace function public.agent_post(
  job                  text,
  url                  text,
  headers              jsonb default '{"Content-Type": "application/json"}'::jsonb,
  body                 jsonb default '{}'::jsonb,
  timeout_milliseconds int default 300000
)
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare
  rid bigint;
begin
  select net.http_post(
    url := agent_post.url,
    headers := agent_post.headers,
    body := agent_post.body,
    timeout_milliseconds := agent_post.timeout_milliseconds
  ) into rid;

  insert into public.agent_calls(request_id, jobname, url)
  values (rid, agent_post.job, agent_post.url)
  on conflict (request_id) do nothing;

  -- pg_net prunes its own response table; this keeps pace with it rather than
  -- growing a mapping for responses that no longer exist.
  delete from public.agent_calls where called_at < now() - interval '7 days';

  return rid;
end;
$$;
