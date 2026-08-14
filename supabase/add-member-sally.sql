-- One-off: adds Sally as a member on the Japan 2026 trip.
-- Run this AFTER she has signed in at least once (via Google, on
-- https://route-and-stamps.vercel.app) so her profiles row exists —
-- the insert below is a no-op (0 rows) if it doesn't exist yet.

with her as (
  select id from public.profiles
  where id = (select id from auth.users where email = 'sallyndungu13@gmail.com')
),
trip as (
  select id from public.trips where name = 'Japan 2026'
)
insert into public.trip_members (trip_id, user_id, role)
select trip.id, her.id, 'member' from trip, her;
