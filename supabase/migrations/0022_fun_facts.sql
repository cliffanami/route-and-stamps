begin;

-- ROADMAP.md Milestone F — a running feed of destination trivia, mixing a
-- free Wikipedia lookup (cached here, not re-fetched per view) with facts
-- either trip member adds directly. Not AI-generated, keeping this at
-- $0/month (ARCHITECTURE.md's cost ground rule).
create type public.fun_fact_source as enum ('wikipedia', 'manual');

create table public.fun_facts (
  id         uuid primary key default gen_random_uuid(),
  trip_id    uuid not null references public.trips(id) on delete cascade,
  place_id   uuid references public.places(id) on delete set null,
  stop_id    uuid references public.stops(id) on delete set null,
  source     fun_fact_source not null,
  body       text not null,
  -- null for wikipedia-sourced rows — nothing to attribute a keyless API
  -- lookup to.
  added_by   uuid references public.profiles(id),
  created_at timestamptz not null default now()
);

create index idx_fun_facts_trip on public.fun_facts(trip_id);

alter table public.fun_facts enable row level security;

create policy "fun_facts_all_member" on public.fun_facts
  for all using (public.is_trip_member(fun_facts.trip_id));

commit;
