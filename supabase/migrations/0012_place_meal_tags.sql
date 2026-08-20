-- ============================================================================
-- Route & Stamps — Place meal indicators (ROADMAP.md Milestone E)
-- Additive only: no changes to existing places columns or RLS — meal_tags is
-- covered by the same row-level policies already governing every other
-- places column. Deliberately an array, not a single enum column, since a
-- place (e.g. a hotel restaurant) can be more than one meal at once.
-- ============================================================================

begin;

create type meal_tag as enum ('breakfast', 'lunch', 'dinner');

alter table public.places
  add column if not exists meal_tags meal_tag[] not null default '{}';

commit;
