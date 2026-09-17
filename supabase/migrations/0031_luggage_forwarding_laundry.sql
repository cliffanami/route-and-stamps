begin;

-- Off by default — a trip that'll never use a service like Japan's Yamato
-- forwarding shouldn't see the feature surface at all (ROADMAP.md
-- Milestone AA).
alter table public.trips
  add column luggage_forwarding_enabled boolean not null default false;

-- forward_to_place_id is self-referencing and generic on purpose — no
-- carrier/country assumptions baked in, just "this place's luggage goes to
-- that place." on delete set null (not cascade) so deleting the
-- destination place doesn't take the origin place down with it, same
-- treatment nearest_stop_id already gets.
alter table public.places
  add column forward_to_place_id uuid references public.places(id) on delete set null,
  add column forwarding_note text,
  add column laundry_note text;

commit;
