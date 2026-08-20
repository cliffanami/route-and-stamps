-- ============================================================================
-- Route & Stamps — Accommodation moves to the place layer
-- Mirrors Milestone E's meal_tags: mark an actual Place as where you're
-- staying (auto-associates with the right stop via the place's existing
-- nearest_stop_id, same as any other place) rather than a free-text field
-- on the stop. Explicit product call: stops.hotel_info is dropped along
-- with its data ("Kyoto Ryokan Sakura" on Kyoto, "This one" on Hiroshima,
-- at time of writing) — same treatment as meals_info in 0013.
-- ============================================================================

begin;

alter table public.places
  add column if not exists is_accommodation boolean not null default false;

alter table public.stops
  drop column if exists hotel_info;

commit;
