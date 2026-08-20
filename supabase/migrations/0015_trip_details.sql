-- ============================================================================
-- Route & Stamps — Trip description (ROADMAP.md Milestone A)
-- Additive only. start_date/end_date already exist on trips (0001_init.sql)
-- but have never been surfaced in the UI — this milestone's Settings route
-- is what exposes them, not what creates them.
-- ============================================================================

begin;

alter table public.trips
  add column if not exists description text;

commit;
