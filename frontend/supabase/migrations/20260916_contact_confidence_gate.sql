-- Say whether the contact we hold is actually the person who registered the
-- business.
--
-- DataSkip is an address lookup: it answers "who is associated with this
-- property", which for a new LLC is often the landlord, the apartment company,
-- and in one case the United States Postal Service. Measured against the
-- officer names Florida publishes, 712 of 1,001 traced leads name somebody
-- else entirely. We have been emailing strangers about a website built for a
-- business they do not own.
--
-- The officer names were already sitting in all_officers_json. Nothing new has
-- to be bought or fetched to know this.

alter table public.leads
  add column if not exists contact_confidence text;

comment on column public.leads.contact_confidence is
  'owner = contact first AND last name match a filed officer; household = surname only (spouse/relative); mismatch = a different person; null = never traced.';

/**
 * Names, reduced to what can actually be compared.
 *
 * Case, punctuation, and the middle initials SunBiz packs into the first-name
 * field ("BRENDAN       D") all have to go before two names can be compared at
 * all.
 */
create or replace function public.name_key(s text)
returns text language sql immutable as $$
  select upper(regexp_replace(coalesce(s, ''), '[^A-Za-z]', '', 'g'));
$$;

/**
 * Is this officer a person, or another company?
 *
 * Officers can be holding companies — "C Ameribot Holdings Ll" is a real
 * example. A company can never be the person who answers the phone, so it must
 * not count as a match.
 */
create or replace function public.officer_is_person(last text, first text)
returns boolean language sql immutable as $$
  select coalesce(last, '') <> ''
     and upper(coalesce(last,'') || ' ' || coalesce(first,'')) !~
         '\m(LLC|INC|CORP|CORPORATION|COMPANY|CO|LTD|LP|LLP|PA|PLLC|TRUST|HOLDINGS|GROUP|PARTNERS|ENTERPRISES|MANAGEMENT|PROPERTIES|INVESTMENTS|VENTURES|CAPITAL|ESTATES|BANK|SERVICE|SERVICES)\M';
$$;

/**
 * Grade a traced contact against every officer on the filing.
 *
 * Surname matching is deliberately generous — either name containing the other
 * accepts "LOSETO PEREIRA" against "PEREIRA", and hyphenated or married
 * double-barrels. That makes the mismatch count a LOWER bound: the real error
 * rate is at least this bad, never better.
 *
 * Three grades rather than pass/fail, because collapsing them would throw away
 * 93 leads where the surname matches but the first name does not. Those are
 * overwhelmingly a spouse at the same address — in a family business, still
 * worth a conversation, just not someone to address by the wrong name.
 */
create or replace function public.grade_contact(
  officers jsonb, c_first text, c_last text
) returns text language plpgsql immutable as $$
declare
  o        jsonb;
  o_last   text;
  o_first  text;
  k_last   text := public.name_key(c_last);
  k_first  text := public.name_key(c_first);
  m_last   text;
  m_first  text;
  best     text := 'mismatch';
begin
  if k_last = '' then return null; end if;
  if officers is null or jsonb_typeof(officers) <> 'array' then return null; end if;

  for o in select * from jsonb_array_elements(officers) loop
    o_last  := o->>'lastName';
    o_first := o->>'firstName';
    if not public.officer_is_person(o_last, o_first) then continue; end if;

    m_last  := public.name_key(o_last);
    m_first := public.name_key(o_first);
    if m_last = '' then continue; end if;

    if m_last = k_last
       or (length(m_last) >= 4 and length(k_last) >= 4
           and (position(m_last in k_last) > 0 or position(k_last in m_last) > 0)) then
      -- Surname agrees. Does the first name agree too? Four characters is
      -- enough to separate Robert from Roberta's household while tolerating
      -- the middle initial SunBiz appends.
      if m_first <> '' and k_first <> ''
         and (left(m_first, 4) = left(k_first, 4)) then
        return 'owner';
      end if;
      best := 'household';
    end if;
  end loop;

  return best;
end;
$$;

/**
 * Keep the grade correct without anyone having to remember to set it.
 *
 * There are already two writers that touch contact fields, and every silent
 * failure this project has had came from one writer forgetting. A trigger
 * cannot forget.
 */
create or replace function public.set_contact_confidence()
returns trigger language plpgsql as $$
begin
  new.contact_confidence :=
    public.grade_contact(new.all_officers_json, new.contact_first_name, new.contact_last_name);
  return new;
end;
$$;

drop trigger if exists set_contact_confidence on public.leads;
create trigger set_contact_confidence
  before insert or update of contact_first_name, contact_last_name, all_officers_json
  on public.leads
  for each row execute function public.set_contact_confidence();

-- Grade everything already on file.
update public.leads
set contact_confidence =
      public.grade_contact(all_officers_json, contact_first_name, contact_last_name)
where contact_last_name is not null and contact_last_name <> '';

create index if not exists leads_contact_confidence_idx
  on public.leads (contact_confidence) where contact_confidence is not null;;
