-- ============================================================================
-- Route & Stamps — Per-trip currency/category config (ROADMAP.md Milestone A
-- follow-up) — schema only. Simple text arrays, not a managed table with
-- rename/archive: at this app's real scale (two users, one trip, $0/month
-- ground rule) a handful of category names grouped by plain text is not a
-- scale problem, and a relational table mainly buys rename-cascade
-- integrity, a different tradeoff than "scale". Real values for the live
-- Japan 2026 trip are seeded via a direct data update, not this migration —
-- consistent with how seed-m0.sql/seed-stops-m0.sql keep data separate from
-- schema migrations.
-- ============================================================================

begin;

alter table public.trips
  add column if not exists currencies text[] not null default '{}',
  add column if not exists tip_categories text[] not null default '{}',
  add column if not exists budget_categories text[] not null default '{}';

commit;
