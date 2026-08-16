-- ============================================================================
-- Route & Stamps — budget-per-place, tips-per-stop (ROADMAP.md Milestone B)
-- Both nullable, additive FKs. No RLS changes needed — the existing
-- trip-scoped policies (budget_lines_all_member, tips_all_member) key off
-- trip_id, unaffected by an additive column.
-- ============================================================================

begin;

alter table public.budget_lines
  add column place_id uuid references public.places(id) on delete set null;

alter table public.tips
  add column related_stop_id uuid references public.stops(id) on delete set null;

commit;
