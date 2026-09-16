-- A Facebook page is not a website.
--
-- A lead is disqualified when maps_website is set, on the reasoning that a
-- business with a site does not need one built. But Google puts whatever link
-- the owner gave it in that field, and for some that is a Facebook page, an
-- Instagram profile, or a Linktree.
--
-- Someone whose entire web presence is a Facebook page is not a lost cause —
-- they are the best prospect on the list. They have already decided they want
-- to be findable online and have settled for a page they do not own and cannot
-- rank. They were being thrown away as though they had a website.
--
-- The real link is kept in maps_web_presence so nothing is lost and the
-- decision can be revisited; maps_website is cleared so that every query that
-- already tests it — the build trigger, the copy generator, the call list —
-- becomes correct without being edited. Four places that could each have been
-- missed, fixed once.

alter table public.leads
  add column if not exists maps_web_presence text;

comment on column public.leads.maps_web_presence is
  'What Google had in the website field when it is not a real site of the business own: the Facebook/Instagram/Linktree/builder-subdomain URL. maps_website is cleared in that case so the lead stays qualified.';

update public.leads
set maps_web_presence = maps_website,
    maps_website = null,
    -- The lead was parked as already_has_website on the strength of that link.
    contact_status = case when contact_status = 'already_has_website'
                          then 'matched' else contact_status end
where maps_website is not null
  and maps_website <> ''
  and (
       maps_website ilike '%facebook.%'
    or maps_website ilike '%instagram.%'
    or maps_website ilike '%linktr.ee%'
    or maps_website ilike '%linktree%'
    or maps_website ilike '%business.site%'
    or maps_website ilike '%wixsite.%'
    or maps_website ilike '%.wix.com%'
    or maps_website ilike '%weebly.com%'
    or maps_website ilike '%godaddysites.com%'
    or maps_website ilike '%yelp.%'
    or maps_website ilike '%nextdoor.%'
  );;
