-- ============================================================================
-- Route & Stamps — Database Schema
-- Target: Supabase Postgres
-- Source of truth: PRD v0.5, Fig. 5 (data model) + §12c NFRs
-- Run as: supabase/migrations/0001_init.sql
-- ============================================================================

begin;

-- ----------------------------------------------------------------------------
-- Extensions
-- ----------------------------------------------------------------------------
create extension if not exists "pgcrypto";  -- gen_random_uuid()

-- ----------------------------------------------------------------------------
-- Enums
-- ----------------------------------------------------------------------------
create type trip_role as enum ('owner', 'member');
create type vote_level as enum ('interested', 'want', 'really_want', 'must_go', 'skip');
create type booking_status as enum ('not_booked', 'booked', 'confirmed');
create type budget_mode as enum ('cap', 'tally');
create type budget_status as enum ('not_booked', 'pending', 'paid');
create type tip_format as enum ('text', 'video');
create type notification_type as enum ('consensus_reached', 'place_added', 'tip_added', 'vote_cast');

-- ----------------------------------------------------------------------------
-- profiles — extends auth.users (PRD: User entity)
-- ----------------------------------------------------------------------------
create table public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  display_name text not null,
  avatar_url    text,
  created_at   timestamptz not null default now()
);

-- Auto-create a profile row when someone signs up via Supabase Auth.
create function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, display_name, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    new.raw_user_meta_data->>'avatar_url'
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ----------------------------------------------------------------------------
-- trips
-- ----------------------------------------------------------------------------
create table public.trips (
  id                   uuid primary key default gen_random_uuid(),
  name                 text not null,
  start_date           date,
  end_date             date,
  is_international     boolean not null default false,
  budget_mode          budget_mode not null default 'tally',
  budget_cap           numeric(12, 2),           -- null when budget_mode = 'tally'
  budget_cap_currency  text,                      -- ISO 4217, e.g. 'KES' — null when no cap
  created_by           uuid not null references public.profiles(id),
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now(),

  constraint budget_cap_requires_currency
    check (budget_cap is null or budget_cap_currency is not null)
);

-- ----------------------------------------------------------------------------
-- trip_members — join table gating all access (PRD §12: flat permissions in v1)
-- ----------------------------------------------------------------------------
create table public.trip_members (
  trip_id   uuid not null references public.trips(id) on delete cascade,
  user_id   uuid not null references public.profiles(id) on delete cascade,
  role      trip_role not null default 'member',
  joined_at timestamptz not null default now(),
  primary key (trip_id, user_id)
);

create index idx_trip_members_user on public.trip_members(user_id);

-- ----------------------------------------------------------------------------
-- trip_invites — unguessable-token invite links (PRD §6.2, §12c security)
-- ----------------------------------------------------------------------------
create table public.trip_invites (
  token       uuid primary key default gen_random_uuid(),  -- unguessable by design
  trip_id     uuid not null references public.trips(id) on delete cascade,
  created_by  uuid not null references public.profiles(id),
  created_at  timestamptz not null default now(),
  expires_at  timestamptz not null default (now() + interval '30 days'),
  used_by     uuid references public.profiles(id),          -- set once redeemed
  used_at     timestamptz
);

create index idx_trip_invites_trip on public.trip_invites(trip_id);

-- ----------------------------------------------------------------------------
-- stops — the fixed itinerary (PRD §6.1: never votable)
-- ----------------------------------------------------------------------------
create table public.stops (
  id          uuid primary key default gen_random_uuid(),
  trip_id     uuid not null references public.trips(id) on delete cascade,
  name        text not null,
  town        text,
  lat         double precision not null,
  lng         double precision not null,
  order_index integer not null,
  date_label  text,
  is_pending  boolean not null default false,   -- e.g. Kumamoto, pending guide confirmation
  created_at  timestamptz not null default now()
);

create index idx_stops_trip on public.stops(trip_id);
create unique index idx_stops_trip_order on public.stops(trip_id, order_index);

-- ----------------------------------------------------------------------------
-- places — user-suggested spots, distinct from stops (PRD §6.1)
-- ----------------------------------------------------------------------------
create table public.places (
  id               uuid primary key default gen_random_uuid(),
  trip_id          uuid not null references public.trips(id) on delete cascade,
  name             text not null,
  lat              double precision,
  lng              double precision,
  town             text,                          -- reverse-geocoded (PRD §6.1)
  nearest_stop_id  uuid references public.stops(id) on delete set null,
  source_url       text,                           -- pasted Instagram/TikTok link
  embed_html       text,                            -- cached oEmbed response
  photo_url        text,                             -- Supabase Storage object path
  note             text,                              -- "why we want to go"
  booking_status   booking_status not null default 'not_booked',
  needs_name       boolean not null default false,     -- Inbox item awaiting a name
  visited_at       timestamptz,                          -- PRD §6.6, nullable
  added_by         uuid not null references public.profiles(id),
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create index idx_places_trip on public.places(trip_id);
create index idx_places_nearest_stop on public.places(nearest_stop_id);
create index idx_places_trip_located on public.places(trip_id) where lat is not null;

-- ----------------------------------------------------------------------------
-- votes — one row per (place, user); this is what makes voting per-person (PRD §6.1)
-- ----------------------------------------------------------------------------
create table public.votes (
  place_id   uuid not null references public.places(id) on delete cascade,
  user_id    uuid not null references public.profiles(id) on delete cascade,
  level      vote_level not null,
  updated_at timestamptz not null default now(),
  primary key (place_id, user_id)
);

create index idx_votes_place on public.votes(place_id);

-- ----------------------------------------------------------------------------
-- budget_lines — the ledger, explicitly not a payments system (PRD §8)
-- ----------------------------------------------------------------------------
create table public.budget_lines (
  id               uuid primary key default gen_random_uuid(),
  trip_id          uuid not null references public.trips(id) on delete cascade,
  category         text not null,               -- flights, accommodation, guided_tour, visa, meals, activities, other
  description      text not null,
  amount_minor     bigint not null,               -- integer minor units (PRD §12c data correctness — never float)
  currency         text not null,                  -- ISO 4217
  status           budget_status not null default 'not_booked',
  paid_by          uuid references public.profiles(id),
  payment_details  text,
  due_date         date,
  created_by       uuid not null references public.profiles(id),
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create index idx_budget_lines_trip on public.budget_lines(trip_id);
create index idx_budget_lines_trip_status on public.budget_lines(trip_id, status);
create index idx_budget_lines_trip_currency on public.budget_lines(trip_id, currency);

-- ----------------------------------------------------------------------------
-- packing_items — shared trip-essentials + personal per-user lists (PRD §9)
-- ----------------------------------------------------------------------------
create table public.packing_items (
  id           uuid primary key default gen_random_uuid(),
  trip_id      uuid not null references public.trips(id) on delete cascade,
  owner_id     uuid references public.profiles(id),   -- null = shared/trip-essentials item
  name         text not null,
  category     text,
  is_document  boolean not null default false,
  is_checked   boolean not null default false,
  created_at   timestamptz not null default now()
);

create index idx_packing_items_trip on public.packing_items(trip_id);

-- ----------------------------------------------------------------------------
-- tips — trip-scoped advice, distinct from places (PRD §6.4)
-- ----------------------------------------------------------------------------
create table public.tips (
  id               uuid primary key default gen_random_uuid(),
  trip_id          uuid not null references public.trips(id) on delete cascade,
  category         text not null,                  -- free-form tag, not an enum — PRD §6.4
  format           tip_format not null,
  content_text     text,
  source_url       text,
  embed_html       text,
  related_place_id uuid references public.places(id) on delete set null,
  added_by         uuid not null references public.profiles(id),
  created_at       timestamptz not null default now()
);

create index idx_tips_trip on public.tips(trip_id);
create index idx_tips_trip_category on public.tips(trip_id, category);

-- ----------------------------------------------------------------------------
-- notifications — feed for the tiered instant/digest model (PRD §6.5)
-- ----------------------------------------------------------------------------
create table public.notifications (
  id           uuid primary key default gen_random_uuid(),
  trip_id      uuid not null references public.trips(id) on delete cascade,
  recipient_id uuid not null references public.profiles(id) on delete cascade,
  type         notification_type not null,
  payload      jsonb not null default '{}',
  is_instant   boolean not null default false,     -- true = send immediately, false = batch into digest
  read_at      timestamptz,
  digested_at  timestamptz,                          -- set when included in a sent digest email
  created_at   timestamptz not null default now()
);

create index idx_notifications_recipient on public.notifications(recipient_id) where read_at is null;
create index idx_notifications_digest_pending on public.notifications(recipient_id) where digested_at is null and is_instant = false;

-- ============================================================================
-- Shared trigger: updated_at auto-maintenance
-- ============================================================================
create function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger trg_trips_updated_at before update on public.trips
  for each row execute function public.set_updated_at();
create trigger trg_places_updated_at before update on public.places
  for each row execute function public.set_updated_at();
create trigger trg_budget_lines_updated_at before update on public.budget_lines
  for each row execute function public.set_updated_at();

-- ============================================================================
-- Geo helper — Haversine distance in km (PRD decision: no PostGIS at this scale)
-- ============================================================================
create function public.haversine_km(lat1 double precision, lng1 double precision,
                                     lat2 double precision, lng2 double precision)
returns double precision language sql immutable as $$
  select 6371 * 2 * asin(sqrt(
    sin(radians(lat2 - lat1) / 2) ^ 2 +
    cos(radians(lat1)) * cos(radians(lat2)) *
    sin(radians(lng2 - lng1) / 2) ^ 2
  ));
$$;

-- Used by the "possible duplicate" nudge (PRD §6.1): places within ~150m and similar name.
create function public.nearby_places(p_trip_id uuid, p_lat double precision, p_lng double precision, p_radius_km double precision default 0.15)
returns setof public.places language sql stable as $$
  select * from public.places
  where trip_id = p_trip_id
    and lat is not null
    and public.haversine_km(lat, lng, p_lat, p_lng) <= p_radius_km;
$$;

-- ============================================================================
-- Row Level Security
-- All trip-scoped tables share one pattern: a user may act on a row only if
-- they're a member of the trip that row belongs to. This is the entire
-- authorization model — no separate API-layer permission checks needed.
-- ============================================================================

alter table public.profiles         enable row level security;
alter table public.trips            enable row level security;
alter table public.trip_members     enable row level security;
alter table public.trip_invites     enable row level security;
alter table public.stops            enable row level security;
alter table public.places           enable row level security;
alter table public.votes            enable row level security;
alter table public.budget_lines     enable row level security;
alter table public.packing_items    enable row level security;
alter table public.tips             enable row level security;
alter table public.notifications    enable row level security;

-- Membership check as a SECURITY DEFINER function, not an inline subquery.
-- trip_members' own policy needs to check trip_members membership, and an
-- inline `exists (select 1 from trip_members ...)` inside that policy would
-- recurse into itself (and, transitively, break every other table's policy
-- that checks membership the same way). A SECURITY DEFINER function's body
-- runs with the privileges of its owner (the migration role, which bypasses
-- RLS), so this check never re-enters policy evaluation. Standard Supabase
-- pattern for recursive RLS: https://supabase.com/docs/guides/database/postgres/row-level-security#recursive-rls-policies
create function public.is_trip_member(p_trip_id uuid, p_user_id uuid default auth.uid())
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.trip_members
    where trip_id = p_trip_id and user_id = p_user_id
  );
$$;

-- profiles: readable by anyone authenticated (needed to show "added by Sally");
-- writable only by the owner.
create policy "profiles_select_authenticated" on public.profiles
  for select using (auth.role() = 'authenticated');
create policy "profiles_update_own" on public.profiles
  for update using (auth.uid() = id);

-- trips: visible/editable only to members.
create policy "trips_select_member" on public.trips
  for select using (public.is_trip_member(id));
create policy "trips_update_member" on public.trips
  for update using (public.is_trip_member(id));
create policy "trips_insert_own" on public.trips
  for insert with check (created_by = auth.uid());

-- trip_members: visible to other members of the same trip; a user can always see their own rows.
create policy "trip_members_select" on public.trip_members
  for select using (
    user_id = auth.uid() or public.is_trip_member(trip_id)
  );
create policy "trip_members_insert_via_invite" on public.trip_members
  for insert with check (user_id = auth.uid());  -- redemption path validated in the invite Route Handler

-- trip_invites: only members can create; token itself is the read-access control for redemption.
create policy "trip_invites_select_member" on public.trip_invites
  for select using (public.is_trip_member(trip_id));
create policy "trip_invites_insert_member" on public.trip_invites
  for insert with check (public.is_trip_member(trip_id));

-- Generic trip-scoped policy, applied identically to stops/places/votes(via place)/
-- budget_lines/packing_items/tips/notifications(via recipient).

create policy "stops_all_member" on public.stops
  for all using (public.is_trip_member(stops.trip_id));

create policy "places_all_member" on public.places
  for all using (public.is_trip_member(places.trip_id));

create policy "votes_all_member" on public.votes
  for all using (
    exists (
      select 1 from public.places p
      where p.id = votes.place_id and public.is_trip_member(p.trip_id)
    )
  );

create policy "budget_lines_all_member" on public.budget_lines
  for all using (public.is_trip_member(budget_lines.trip_id));

create policy "packing_items_all_member" on public.packing_items
  for all using (public.is_trip_member(packing_items.trip_id));

create policy "tips_all_member" on public.tips
  for all using (public.is_trip_member(tips.trip_id));

-- notifications: a user only ever sees their own.
create policy "notifications_select_own" on public.notifications
  for select using (recipient_id = auth.uid());
create policy "notifications_update_own" on public.notifications
  for update using (recipient_id = auth.uid());

-- ============================================================================
-- Realtime — enable logical replication for the tables the client subscribes to
-- (PRD §6.1 "syncs instantly"; drives the notification dispatch too)
-- ============================================================================
alter publication supabase_realtime add table public.places;
alter publication supabase_realtime add table public.votes;
alter publication supabase_realtime add table public.tips;
alter publication supabase_realtime add table public.budget_lines;
alter publication supabase_realtime add table public.notifications;

commit;
