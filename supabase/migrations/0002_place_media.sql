-- ============================================================================
-- Route & Stamps — Place media storage (ROADMAP.md M2, PRD §6.3)
-- Additive only: no changes to public.places (photo_url/embed_html/source_url
-- already exist from 0001_init.sql) or to any existing RLS policy.
-- ============================================================================

begin;

-- Private bucket — not public URLs, per PRD §12c (ARCHITECTURE.md Storage row).
-- Reads go through a signed URL generated client-side, scoped to a short TTL.
insert into storage.buckets (id, name, public)
values ('place-photos', 'place-photos', false)
on conflict (id) do nothing;

-- Object path convention: {trip_id}/{place_id}/{filename} — trip_id is the
-- first path segment, so storage.foldername(name) lets policies reuse the
-- same is_trip_member() function every other table's RLS already relies on.
-- drop-if-exists first so this migration is safe to re-run (CREATE POLICY
-- has no IF NOT EXISTS form in Postgres).
drop policy if exists "place_photos_select_member" on storage.objects;
create policy "place_photos_select_member" on storage.objects
  for select using (
    bucket_id = 'place-photos'
    and public.is_trip_member((storage.foldername(name))[1]::uuid)
  );

drop policy if exists "place_photos_insert_member" on storage.objects;
create policy "place_photos_insert_member" on storage.objects
  for insert with check (
    bucket_id = 'place-photos'
    and public.is_trip_member((storage.foldername(name))[1]::uuid)
  );

drop policy if exists "place_photos_update_member" on storage.objects;
create policy "place_photos_update_member" on storage.objects
  for update using (
    bucket_id = 'place-photos'
    and public.is_trip_member((storage.foldername(name))[1]::uuid)
  );

drop policy if exists "place_photos_delete_member" on storage.objects;
create policy "place_photos_delete_member" on storage.objects
  for delete using (
    bucket_id = 'place-photos'
    and public.is_trip_member((storage.foldername(name))[1]::uuid)
  );

commit;
