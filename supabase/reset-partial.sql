-- One-off: fully reverts a botched partial application of 0001_init.sql —
-- drops every table/function/type it creates, in dependency order. Safe
-- only because nothing has been seeded yet (no real trip/place/vote data).
-- Run this once, then re-run supabase/migrations/0001_init.sql fresh.
-- Delete this file once 0001_init.sql applies cleanly.

drop table if exists public.notifications cascade;
drop table if exists public.tips cascade;
drop table if exists public.packing_items cascade;
drop table if exists public.budget_lines cascade;
drop table if exists public.votes cascade;
drop table if exists public.places cascade;
drop table if exists public.stops cascade;
drop table if exists public.trip_invites cascade;
drop table if exists public.trip_members cascade;
drop table if exists public.trips cascade;

drop trigger if exists on_auth_user_created on auth.users;
drop table if exists public.profiles cascade;

drop function if exists public.nearby_places(uuid, double precision, double precision, double precision) cascade;
drop function if exists public.haversine_km(double precision, double precision, double precision, double precision) cascade;
drop function if exists public.set_updated_at() cascade;
drop function if exists public.handle_new_user() cascade;

drop type if exists notification_type cascade;
drop type if exists tip_format cascade;
drop type if exists budget_status cascade;
drop type if exists budget_mode cascade;
drop type if exists booking_status cascade;
drop type if exists vote_level cascade;
drop type if exists trip_role cascade;
