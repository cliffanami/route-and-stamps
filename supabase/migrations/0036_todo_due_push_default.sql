-- todo_due is instant (like packing_due), same default-on treatment as
-- the other instant types — matches 0025_stop_checkins.sql's precedent.
-- Existing profiles keep whatever they already have; nothing
-- retroactively enabled for them.
begin;

alter table public.profiles
  alter column push_enabled_types
  set default array['consensus_reached', 'arrival_estimated', 'packing_due', 'trip_joined', 'checked_in', 'todo_due']::notification_type[];

commit;
