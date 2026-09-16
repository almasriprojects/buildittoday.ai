/**
 * Write a batch of state-filed email addresses.
 *
 * Not an upsert. PostgREST's merge-duplicates sends the row as an INSERT with
 * only the named columns populated, so every other field arrives null and the
 * write is rejected by the first NOT NULL constraint it meets — which is what
 * happened the first time this ran. An UPDATE ... FROM touches only the two
 * columns named and leaves the rest of the lead alone.
 *
 * Batched because the October import will carry tens of thousands of rows and
 * one HTTP request per lead would take the best part of an hour.
 */
create or replace function public.apply_state_emails(payload jsonb)
returns integer
language plpgsql
security definer
set search_path to ''
as $$
declare
  n integer;
begin
  with incoming as (
    select * from jsonb_to_recordset(payload)
      as x(id uuid, email text, src text)
  ), done as (
    update public.leads l
    set state_email = incoming.email,
        state_email_source = incoming.src
    from incoming
    where l.id = incoming.id
      and incoming.email is not null
      and incoming.email <> ''
    returning 1
  )
  select count(*) into n from done;
  return n;
end;
$$;;
