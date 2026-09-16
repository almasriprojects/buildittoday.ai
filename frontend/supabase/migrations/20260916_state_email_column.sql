-- The email address the business itself gave the State of Florida.
--
-- Florida publishes every entity's correspondence email quarterly, as a plain
-- document_number,email CSV — 10.7 million rows, on the same SFTP we already
-- pull the daily filings from. It is free, it needs no card and no vendor, and
-- it is keyed on the document number we already store.
--
-- It is also a different kind of address from the one we have been using.
-- contact_email comes from a property lookup and names the wrong person 71% of
-- the time; this is what the owner wrote on their own filing.
--
-- Kept in its own column rather than overwriting contact_email, so the two can
-- be compared and nothing already sent is rewritten underneath us.

alter table public.leads
  add column if not exists state_email text,
  add column if not exists state_email_source text;

comment on column public.leads.state_email is
  'Correspondence email from the Florida DOS quarterly email file — the address the business filed itself. Trusted above contact_email, which comes from an address lookup.';
comment on column public.leads.state_email_source is
  'Which quarterly file this address came from, so a later quarter can supersede an earlier one.';

create index if not exists leads_state_email_idx
  on public.leads (state_email) where state_email is not null;

/**
 * Which quarterly files have been imported.
 *
 * The files are ~400MB uncompressed and are published about ten days after
 * each quarter ends. Recording them here keeps a re-run cheap and makes it
 * obvious when a new quarter has not been picked up.
 */
create table if not exists public.state_email_imports (
  filename      text primary key,
  imported_at   timestamptz not null default now(),
  rows_read     bigint,
  leads_matched integer,
  leads_updated integer,
  notes         text
);;
