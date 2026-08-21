-- ============================================================================
-- Route & Stamps — Stop/trip travel detail fields (Japan trip seed v2 +
-- Milestone C groundwork)
--
-- transport_cost_status is a brand-new enum type (not extending an existing
-- one), so — unlike Milestone D's scheduling-enum split — create-type and
-- use-type can safely run in the same transaction here; the
-- same-transaction restriction only applies to ALTER TYPE ... ADD VALUE on
-- an *existing* type. Confirmed against the live schema before writing
-- this: neither transport_cost_status nor any transport-mode enum existed.
--
-- transport_mode is deliberately plain text on stops, not its own enum —
-- valid values come from trips.transport_modes (below), a per-trip
-- configurable array (ROADMAP.md Milestone C), so a trip can add something
-- idiosyncratic (a future trip's gondola, this trip's cycling day) without
-- ALTER TYPE friction. The array gets a real default rather than '{}' so a
-- brand-new trip starts with a sane set instead of empty — every value a
-- new trip could plausibly need on day one, without locking anything down
-- the way a fixed enum would.
-- ============================================================================

begin;

create type transport_cost_status as enum ('included', 'own_account', 'check');

alter table public.stops
  add column if not exists description text,
  add column if not exists transport_mode text,
  add column if not exists transport_detail text,
  add column if not exists transport_cost_status transport_cost_status,
  add column if not exists departure_point text,
  add column if not exists arrival_point text;

alter table public.trips
  add column if not exists outbound_travel_note text,
  add column if not exists return_travel_note text,
  add column if not exists transport_modes text[] not null
    default array['train', 'bicycle', 'walk', 'bus', 'ferry', 'taxi', 'flight'];

alter table public.budget_lines
  add column if not exists paid_at date,
  add column if not exists stop_id uuid references public.stops(id) on delete set null;

commit;
