-- One-off M0 seed: creates the hardcoded Japan 2026 trip and makes you its
-- owner. Run this in the Supabase SQL Editor AFTER:
--   1. supabase/migrations/0001_init.sql has been applied, and
--   2. you've signed in at least once (via the login page's magic-link
--      fallback or Google), so your profiles row exists.
-- Not a migration — it references a specific email and is meant to run once.
-- Real stops (names/towns/lat-lng/dates) still need to be added once the
-- trip spreadsheet data is available.

with me as (
  select id from public.profiles
  where id = (select id from auth.users where email = 'cliff.moffitt@gmail.com')
),
new_trip as (
  insert into public.trips (name, is_international, budget_mode, created_by)
  select 'Japan 2026', true, 'tally', me.id from me
  returning id
)
insert into public.trip_members (trip_id, user_id, role)
select new_trip.id, me.id, 'owner' from new_trip, me;
