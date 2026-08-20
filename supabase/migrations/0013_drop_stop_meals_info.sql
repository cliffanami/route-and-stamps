-- ============================================================================
-- Route & Stamps — Drop stops.meals_info (superseded by Milestone E)
-- Explicit product call, not an oversight: per-place meal_tags (0012) now
-- covers "which meal happens where"; the free-text per-stop meals_info
-- field was judged redundant on top of that. Existing values ("All" on
-- Hiroshima and Tokyo, at time of writing) are deliberately not migrated
-- anywhere else — dropped along with the column.
-- ============================================================================

begin;

alter table public.stops
  drop column if exists meals_info;

commit;
