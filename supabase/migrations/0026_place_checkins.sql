begin;

-- ROADMAP.md "Places, extended" — extends check-in from stops to places
-- too, so "have we actually been here" is real data, not a UI-only
-- distinction. Same per-person model as stop_checkins (migration 0025),
-- not a single per-place flag — more than one person can independently
-- confirm they've visited a place.
create table public.place_checkins (
  place_id      uuid not null references public.places(id) on delete cascade,
  user_id       uuid not null references public.profiles(id) on delete cascade,
  checked_in_at timestamptz not null default now(),
  primary key (place_id, user_id)
);

create index idx_place_checkins_place on public.place_checkins(place_id);

alter table public.place_checkins enable row level security;

create policy "place_checkins_all_member" on public.place_checkins
  for all using (
    exists (
      select 1 from public.places p
      where p.id = place_checkins.place_id
        and public.is_trip_member(p.trip_id)
    )
  );

-- places.visited_at (0001_init.sql) was never actually wired to any
-- mutation or UI — confirmed dead, not a live column being replaced out
-- from under working code. place_checkins is the real mechanism now.
alter table public.places drop column visited_at;

commit;
