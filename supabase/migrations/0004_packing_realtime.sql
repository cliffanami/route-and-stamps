-- ============================================================================
-- Route & Stamps — Realtime for packing_items (ROADMAP.md M5)
-- Acceptance criterion needs live sync: "the shared list updates for both
-- when either checks an item" — same requirement M1 already established
-- for places/votes. No schema/RLS changes; packing_items and its RLS
-- policy already exist from 0001_init.sql.
-- ============================================================================

begin;

-- Guarded so this is safe to re-run — ALTER PUBLICATION ... ADD TABLE has no
-- IF NOT EXISTS form, and errors if the table is already a member.
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'packing_items'
  ) then
    alter publication supabase_realtime add table public.packing_items;
  end if;
end $$;

commit;
