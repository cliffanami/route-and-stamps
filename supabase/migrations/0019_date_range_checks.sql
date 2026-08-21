-- ============================================================================
-- Route & Stamps — end_date >= start_date, enforced at the database, not
-- just in the form. Same "the database is the actual boundary" principle
-- already applied everywhere else (RLS, the budget_cap_requires_currency
-- check) — a client-only validation stops being true the moment anything
-- touches the data directly (a seed script, a future API, direct SQL).
-- Both nullable, so a stop/trip with only one date set (or neither) is
-- unaffected — this only fires when both are present and inverted.
-- ============================================================================

begin;

alter table public.stops
  add constraint stops_end_after_start
  check (start_date is null or end_date is null or end_date >= start_date);

alter table public.trips
  add constraint trips_end_after_start
  check (start_date is null or end_date is null or end_date >= start_date);

commit;
