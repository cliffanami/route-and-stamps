-- ============================================================================
-- One-off: collapse the 30 duplicate-row visa/document packing items (one
-- row per person, from before migration 0018) down to 15 — one row each,
-- now that is_shared/packing_item_checks track per-person completion
-- properly. Safe to run once: keeps the earliest-created row per
-- (trip_id, name) among non-shared items, deletes the rest. Confirmed live
-- before writing this that none of the 30 were checked yet, so nothing is
-- lost by picking either twin.
-- ============================================================================

begin;

delete from public.packing_items pi
using (
  select id,
         row_number() over (partition by trip_id, name order by created_at) as rn
  from public.packing_items
  where trip_id = (select id from public.trips where name = 'Cliff & Sally''s Japan Journey')
    and is_shared = false
) dupes
where pi.id = dupes.id and dupes.rn > 1;

commit;

-- Verify: select count(*) from packing_items where trip_id = (select id
-- from trips where name = 'Cliff & Sally''s Japan Journey'); -- expect 21
-- (6 shared + 15 now-deduplicated per-person)
