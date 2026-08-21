-- ============================================================================
-- Route & Stamps — Per-person packing completion, matrix-style
-- Replaces the duplicate-row workaround (one packing_items row per person
-- for anything that needs independent tracking) with a proper join table,
-- modeled exactly like `votes` — one row per (item, person) — rather than
-- the ownership-flag-on-a-duplicated-row hack. Flagged as the real fix in
-- ROADMAP.md's Deferred section; building it now since the duplicate rows
-- turned out to be genuinely confusing in practice (two rows with
-- identical text and no visible owner label, shown side by side).
--
-- is_shared decides rendering, not owner_id: a shared item still uses the
-- existing single is_checked flag (unchanged); a non-shared item's
-- completion lives entirely in packing_item_checks, one row per trip
-- member who's checked it. owner_id is dropped, not just abandoned — it
-- had exactly one other dependency (check_packing_reminders(), rewritten
-- below), confirmed via a full grep before dropping.
-- ============================================================================

begin;

alter table public.packing_items
  add column if not exists is_shared boolean not null default true;

-- Existing rows: current data is either owner_id null (already shared,
-- is_shared stays true by default — correct) or owner_id set (the
-- duplicate-row personal items) — those get flipped to is_shared = false;
-- the actual row de-duplication happens in a separate data script, not
-- here (schema migrations stay schema-only, per this repo's convention).
update public.packing_items set is_shared = false where owner_id is not null;

alter table public.packing_items drop column if exists owner_id;

create table public.packing_item_checks (
  item_id    uuid not null references public.packing_items(id) on delete cascade,
  user_id    uuid not null references public.profiles(id) on delete cascade,
  checked_at timestamptz not null default now(),
  primary key (item_id, user_id)
);

alter table public.packing_item_checks enable row level security;

create policy "packing_item_checks_all_member" on public.packing_item_checks
  for all using (
    exists (
      select 1 from public.packing_items pi
      where pi.id = packing_item_checks.item_id
        and public.is_trip_member(pi.trip_id)
    )
  );

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'packing_item_checks'
  ) then
    alter publication supabase_realtime add table public.packing_item_checks;
  end if;
end $$;

-- ----------------------------------------------------------------------------
-- check_packing_reminders(): rewritten for the is_shared model.
-- Shared items: unchanged behavior, notify every trip member once.
-- Non-shared items: notify each trip member individually, only if they
-- personally haven't checked it (no packing_item_checks row) and haven't
-- already been reminded about this specific item — same idempotency
-- guarantee as before (a second invocation doesn't duplicate), just keyed
-- per-recipient instead of per-item, since "done" is now per-person.
-- ----------------------------------------------------------------------------
create or replace function public.check_packing_reminders()
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  r record;
  member record;
begin
  for r in
    select p.id, p.trip_id, p.name
    from public.packing_items p
    where p.is_shared
      and p.due_date is not null
      and p.due_date <= current_date
      and not p.is_checked
      and not exists (
        select 1 from public.notifications n
        where n.type = 'packing_due'
          and (n.payload->>'item_id')::uuid = p.id
      )
  loop
    perform public.notify_trip_members(
      r.trip_id,
      'packing_due',
      jsonb_build_object('item_id', r.id, 'item_name', r.name),
      true,
      null
    );
  end loop;

  for r in
    select p.id, p.trip_id, p.name
    from public.packing_items p
    where not p.is_shared
      and p.due_date is not null
      and p.due_date <= current_date
  loop
    for member in
      select tm.user_id
      from public.trip_members tm
      where tm.trip_id = r.trip_id
        and not exists (
          select 1 from public.packing_item_checks c
          where c.item_id = r.id and c.user_id = tm.user_id
        )
        and not exists (
          select 1 from public.notifications n
          where n.type = 'packing_due'
            and n.recipient_id = tm.user_id
            and (n.payload->>'item_id')::uuid = r.id
        )
    loop
      insert into public.notifications (trip_id, recipient_id, type, payload, is_instant)
      values (r.trip_id, member.user_id, 'packing_due', jsonb_build_object('item_id', r.id, 'item_name', r.name), true);
    end loop;
  end loop;
end;
$$;

commit;
