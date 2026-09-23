-- ============================================================================
-- Route & Stamps — check_todo_reminders() (ROADMAP.md live-usage feedback)
-- Mirrors check_packing_reminders()'s shared-item branch exactly — todos
-- are shared-only (single is_done flag, ROADMAP.md Milestone AE), so
-- there's no per-person loop to mirror, just the one. Idempotent via the
-- same "no existing notification of this type for this row" guard, so a
-- duplicate or overlapping cron run is harmless.
-- ============================================================================

begin;

create function public.check_todo_reminders()
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  r record;
begin
  for r in
    select t.id, t.trip_id, t.text
    from public.todos t
    where t.due_date is not null
      and t.due_date <= current_date
      and not t.is_done
      and not exists (
        select 1 from public.notifications n
        where n.type = 'todo_due'
          and (n.payload->>'todo_id')::uuid = t.id
      )
  loop
    perform public.notify_trip_members(
      r.trip_id,
      'todo_due',
      jsonb_build_object('todo_id', r.id, 'text', r.text),
      true,
      null
    );
  end loop;
end;
$$;

commit;
