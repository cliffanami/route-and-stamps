-- ============================================================================
-- Route & Stamps — todos (ROADMAP.md Milestone AE)
-- One list, not two separate features — a todo can optionally link to a
-- place and/or a trip phase, both tags optional. Shared-only completion
-- (single is_done flag), same as a packing item's shared checkbox — not
-- per-person tracking like packing_item_checks.
-- ============================================================================

begin;

create type todo_phase as enum ('pre_trip', 'during_trip', 'post_trip');

create table public.todos (
  id               uuid primary key default gen_random_uuid(),
  trip_id          uuid not null references public.trips(id) on delete cascade,
  text             text not null,
  is_done          boolean not null default false,
  due_date         date,
  related_place_id uuid references public.places(id) on delete set null,
  phase            todo_phase,
  added_by         uuid not null references public.profiles(id),
  created_at       timestamptz not null default now()
);

create index idx_todos_trip on public.todos(trip_id);
create index idx_todos_trip_phase on public.todos(trip_id, phase);

alter table public.todos enable row level security;

create policy "todos_all_member" on public.todos
  for all using (public.is_trip_member(todos.trip_id));

alter publication supabase_realtime add table public.todos;

-- Routine add — is_instant=false, digest-eligible, same shape as
-- notify_tip_added/notify_place_added.
create function public.notify_todo_added()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  v_added_by_name text;
begin
  select display_name into v_added_by_name
  from public.profiles where id = new.added_by;

  perform public.notify_trip_members(
    new.trip_id,
    'todo_added',
    jsonb_build_object(
      'todo_id', new.id,
      'text', new.text,
      'added_by_name', v_added_by_name
    ),
    false,
    new.added_by
  );

  return new;
end;
$$;

create trigger todos_notify_added
  after insert on public.todos
  for each row execute function public.notify_todo_added();

commit;
