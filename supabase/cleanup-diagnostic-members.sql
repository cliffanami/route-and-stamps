-- One-off: removes the diagnostic/test accounts accumulated on the real
-- Japan 2026 trip during M1 debugging (RLS recursion, empty-stops, and
-- realtime-auth-race investigations) — none of this touched via the app's
-- own RLS policies, since trip_members has no DELETE policy by design (the
-- invite flow that would validate removal doesn't exist yet). Run this
-- directly as the postgres role in the SQL Editor, which bypasses RLS.
--
-- Keeps exactly cliff.moffitt@gmail.com and sallyndungu13@gmail.com;
-- removes every other trip_members row on this trip. Also deletes the
-- now-orphaned auth.users/profiles rows for those diagnostic accounts, so
-- they don't linger in Authentication -> Users either.

with keepers as (
  select id from auth.users
  where email in ('cliff.moffitt@gmail.com', 'sallyndungu13@gmail.com')
),
trip as (
  select id from public.trips where name = 'Japan 2026'
),
diagnostic_members as (
  select tm.user_id
  from public.trip_members tm, trip
  where tm.trip_id = trip.id
    and tm.user_id not in (select id from keepers)
)
delete from public.trip_members
where trip_id = (select id from trip)
  and user_id in (select user_id from diagnostic_members);

-- Deletes the diagnostic auth.users rows too (profiles cascade via FK).
-- Safe to skip this second statement if you'd rather keep the accounts
-- around (e.g. to sign in as one for further testing) and only wanted
-- them off the trip.
delete from auth.users
where email like 'e2e-%@example.com'
   or email like 'diagnostic%@example.com'
   or email like 'checkplaces-%@example.com'
   or email like 'crosssession-%@example.com'
   or email like 'eventstar-%@example.com'
   or email like 'realtimecheck-%@example.com'
   or email like 'tripsinsert-%@example.com';

-- Also removes the isolated throwaway trips the add-place-and-vote E2E
-- spec creates per run (name pattern "E2E Test Trip <timestamp>") —
-- stops/places/trip_members/votes under them cascade-delete via their FKs.
delete from public.trips where name like 'E2E Test Trip %';
