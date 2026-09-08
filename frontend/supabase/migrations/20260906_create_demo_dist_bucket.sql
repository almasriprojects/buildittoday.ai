-- Multi-file engine builds are isolated from legacy one-file demo sites.
-- The public route injects the offer into index.html; this bucket is public
-- solely for static browser assets and the route blocks crawler/index files.
insert into storage.buckets (id, name, public)
values ('demo-dist', 'demo-dist', true)
on conflict (id) do update set public = true;

drop policy if exists "public_can_read_demo_dist_assets" on storage.objects;
create policy "public_can_read_demo_dist_assets"
on storage.objects for select
to anon, authenticated
using (bucket_id = 'demo-dist');
