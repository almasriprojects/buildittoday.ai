-- Public storage bucket holding each lead's generated index.html
-- (produced by publish-demo-site, pointed to by demo_sites.storage_path).
insert into storage.buckets (id, name, public)
values ('demo-sites', 'demo-sites', true)
on conflict (id) do nothing;

create policy "public_can_read_demo_site_files"
on storage.objects for select
to anon, authenticated
using (bucket_id = 'demo-sites');
