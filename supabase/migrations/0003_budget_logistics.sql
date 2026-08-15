-- ============================================================================
-- Route & Stamps — Itinerary-linked logistics on stops (ROADMAP.md M4, PRD §8)
-- Additive only: plain free-text fields, no new tables, no RLS changes
-- (stops_all_member already covers all operations on this table).
-- ============================================================================

begin;

alter table public.stops
  add column if not exists hotel_info text,
  add column if not exists meals_info text,
  add column if not exists guide_info text,
  add column if not exists flight_info text;

commit;
