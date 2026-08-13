-- One-off: fixes the infinite-recursion bug in trip_members_select (and the
-- same pattern copied into every other trip-scoped policy) without touching
-- existing data. Safe to run against a database that already has a seeded
-- trip — this only replaces policy definitions.
-- Delete this file once 0001_init.sql (already fixed) is the only source
-- anyone applies fresh.

begin;

create or replace function public.is_trip_member(p_trip_id uuid, p_user_id uuid default auth.uid())
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.trip_members
    where trip_id = p_trip_id and user_id = p_user_id
  );
$$;

drop policy if exists "trips_select_member" on public.trips;
create policy "trips_select_member" on public.trips
  for select using (public.is_trip_member(id));

drop policy if exists "trips_update_member" on public.trips;
create policy "trips_update_member" on public.trips
  for update using (public.is_trip_member(id));

drop policy if exists "trip_members_select" on public.trip_members;
create policy "trip_members_select" on public.trip_members
  for select using (
    user_id = auth.uid() or public.is_trip_member(trip_id)
  );

drop policy if exists "trip_invites_select_member" on public.trip_invites;
create policy "trip_invites_select_member" on public.trip_invites
  for select using (public.is_trip_member(trip_id));

drop policy if exists "trip_invites_insert_member" on public.trip_invites;
create policy "trip_invites_insert_member" on public.trip_invites
  for insert with check (public.is_trip_member(trip_id));

drop policy if exists "stops_all_member" on public.stops;
create policy "stops_all_member" on public.stops
  for all using (public.is_trip_member(stops.trip_id));

drop policy if exists "places_all_member" on public.places;
create policy "places_all_member" on public.places
  for all using (public.is_trip_member(places.trip_id));

drop policy if exists "votes_all_member" on public.votes;
create policy "votes_all_member" on public.votes
  for all using (
    exists (
      select 1 from public.places p
      where p.id = votes.place_id and public.is_trip_member(p.trip_id)
    )
  );

drop policy if exists "budget_lines_all_member" on public.budget_lines;
create policy "budget_lines_all_member" on public.budget_lines
  for all using (public.is_trip_member(budget_lines.trip_id));

drop policy if exists "packing_items_all_member" on public.packing_items;
create policy "packing_items_all_member" on public.packing_items
  for all using (public.is_trip_member(packing_items.trip_id));

drop policy if exists "tips_all_member" on public.tips;
create policy "tips_all_member" on public.tips
  for all using (public.is_trip_member(tips.trip_id));

commit;
