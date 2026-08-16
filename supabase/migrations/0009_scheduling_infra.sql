-- ============================================================================
-- Route & Stamps — Scheduling infrastructure (ROADMAP.md Milestone D)
-- Real dates on stops, an optional arrival time, packing due-dates, and the
-- first time-based (not event-based) notification mechanism this app has
-- needed. Check-in and the "Estimated vs Confirmed" status badge are
-- deliberately excluded — see ROADMAP.md's "Deferred" section.
-- ============================================================================

begin;

-- date_label stays as an optional free-text override (e.g. "Aug 20-23") —
-- these are the structured columns actual scheduling logic reads.
alter table public.stops
  add column start_date date,
  add column end_date date,
  add column arrival_time timestamptz;

alter table public.packing_items
  add column due_date date;

-- Bug fix: the original signature compared with != against a nullable
-- argument. SQL's three-valued logic makes `x != null` evaluate to unknown
-- (falsy) for every row, so a null p_exclude_user_id would have silently
-- notified nobody — exactly what a system-triggered (no acting user)
-- notification needs to pass. `is distinct from` handles null correctly.
-- Every existing caller passes a real uuid positionally, so this is
-- backward compatible — same behavior as before for all three triggers
-- already using it.
create or replace function public.notify_trip_members(
  p_trip_id uuid,
  p_type notification_type,
  p_payload jsonb,
  p_is_instant boolean,
  p_exclude_user_id uuid default null
)
returns void
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.notifications (trip_id, recipient_id, type, payload, is_instant)
  select p_trip_id, tm.user_id, p_type, p_payload, p_is_instant
  from public.trip_members tm
  where tm.trip_id = p_trip_id and tm.user_id is distinct from p_exclude_user_id;
end;
$$;

-- Fires once per stop — idempotency guard mirrors notify_consensus_reached's
-- existing pattern (check no notification of this type already exists for
-- this stop before sending another). Tentative stops (is_pending — e.g. the
-- schema's own "Kumamoto, pending guide confirmation" example) are excluded:
-- there's nothing to estimate an arrival for if the stop itself isn't
-- confirmed. Uses server-side UTC current_date/now() against plain,
-- timezone-less date columns — for a destination like Japan (UTC+9) this
-- can be off by close to a day depending on what UTC hour the daily cron
-- lands. Accepted as reasonable slop for an *estimate*; there's no
-- timezone column anywhere in this schema to do better with yet.
create function public.check_scheduled_arrivals()
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  r record;
begin
  for r in
    select s.id, s.trip_id, s.name
    from public.stops s
    where not s.is_pending
      and (
        (s.arrival_time is not null and s.arrival_time <= now())
        or (s.arrival_time is null and s.start_date is not null and s.start_date <= current_date)
      )
      and not exists (
        select 1 from public.notifications n
        where n.type = 'arrival_estimated'
          and (n.payload->>'stop_id')::uuid = s.id
      )
  loop
    perform public.notify_trip_members(
      r.trip_id,
      'arrival_estimated',
      jsonb_build_object('stop_id', r.id, 'stop_name', r.name),
      true,
      null
    );
  end loop;
end;
$$;

-- Same idempotency shape. Notifies the item's owner if it's a personal
-- item, or every trip member if it's shared (owner_id is null) — matches
-- packing_items' existing null-means-shared convention.
create function public.check_packing_reminders()
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  r record;
begin
  for r in
    select p.id, p.trip_id, p.name, p.owner_id
    from public.packing_items p
    where p.due_date is not null
      and p.due_date <= current_date
      and not p.is_checked
      and not exists (
        select 1 from public.notifications n
        where n.type = 'packing_due'
          and (n.payload->>'item_id')::uuid = p.id
      )
  loop
    if r.owner_id is not null then
      insert into public.notifications (trip_id, recipient_id, type, payload, is_instant)
      values (r.trip_id, r.owner_id, 'packing_due', jsonb_build_object('item_id', r.id, 'item_name', r.name), true);
    else
      perform public.notify_trip_members(
        r.trip_id,
        'packing_due',
        jsonb_build_object('item_id', r.id, 'item_name', r.name),
        true,
        null
      );
    end if;
  end loop;
end;
$$;

commit;
