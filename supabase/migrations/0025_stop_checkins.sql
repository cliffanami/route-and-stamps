begin;

-- ROADMAP.md "Check-in" — a tap-to-confirm arrival signal, entirely
-- manual and foreground (never geolocation-triggered — the app's
-- existing privacy line is that location stays foreground-only and never
-- persisted, e.g. the current-position map pin). One row per person, per
-- stop, modeled exactly like votes — a stop can be "confirmed" by more
-- than one member checking in independently, and checking in twice
-- (toggle off, toggle back on) is just delete-then-reinsert, not a
-- status field.
create table public.stop_checkins (
  stop_id       uuid not null references public.stops(id) on delete cascade,
  user_id       uuid not null references public.profiles(id) on delete cascade,
  checked_in_at timestamptz not null default now(),
  primary key (stop_id, user_id)
);

create index idx_stop_checkins_stop on public.stop_checkins(stop_id);

alter table public.stop_checkins enable row level security;

create policy "stop_checkins_all_member" on public.stop_checkins
  for all using (
    exists (
      select 1 from public.stops s
      where s.id = stop_checkins.stop_id
        and public.is_trip_member(s.trip_id)
    )
  );

-- A real, instant notification once someone actually checks in —
-- distinct from arrival_estimated's passive date-based guess
-- (check_scheduled_arrivals), which nobody has confirmed. Excludes the
-- checker themselves, same as every other notify_trip_members call.
create function public.notify_checkin()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  v_trip_id uuid;
  v_stop_name text;
  v_checker_name text;
begin
  select trip_id, name into v_trip_id, v_stop_name
  from public.stops where id = new.stop_id;

  select display_name into v_checker_name
  from public.profiles where id = new.user_id;

  perform public.notify_trip_members(
    v_trip_id,
    'checked_in',
    jsonb_build_object('stop_id', new.stop_id, 'stop_name', v_stop_name, 'checker_name', v_checker_name),
    true,
    new.user_id
  );

  return new;
end;
$$;

create trigger stop_checkins_notify
  after insert on public.stop_checkins
  for each row execute function public.notify_checkin();

-- New profiles default to pushing check-ins too — same is_instant=true
-- treatment as the other three defaults. Existing profiles keep whatever
-- they already have; nothing retroactively enabled for them, same as
-- every other opt-in preference in this app.
alter table public.profiles
  alter column push_enabled_types
  set default array['consensus_reached', 'arrival_estimated', 'packing_due', 'trip_joined', 'checked_in']::notification_type[];

commit;
