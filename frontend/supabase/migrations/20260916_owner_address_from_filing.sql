-- The owner's own address, as they filed it with the state.
--
-- Each of the six officer blocks in the SunBiz daily file is 128 bytes and we
-- were reading the first 45 — title, type, surname, forename — and discarding
-- the remaining 83, which hold the officer's own street, city, state and zip.
-- Verified against a live file: the two-letter state followed by a five-digit
-- zip sits at offset 117 in 100% of 3,434 officer blocks, and 93.3% of 65,483
-- records carry an address for the first officer.
--
-- This is not used to re-run the address lookup — that was tested and rejected,
-- because the lookup returns the property's owner and is wrong 68% of the time
-- even when handed the right address. It is stored because a name-based lookup
-- needs a city and state alongside the name, and because it is the owner's own
-- address rather than a registered agent's office.

alter table public.leads
  add column if not exists owner_street_address text,
  add column if not exists owner_city           text,
  add column if not exists owner_state          text,
  add column if not exists owner_zip            text;

comment on column public.leads.owner_street_address is
  'The first officer''s own address from the SunBiz filing — distinct from street_address, which is the business/registered-agent address.';;
