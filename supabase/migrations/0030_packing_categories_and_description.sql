begin;

-- Category picker, same shape as currencies/tip_categories/budget_categories
-- (0016) — that milestone's fast-follow never actually included packing
-- (ROADMAP.md Milestone Q). Non-empty default, same precedent as
-- transport_modes (0017): a brand-new trip starts with a sane starter set,
-- not an empty picker.
alter table public.trips
  add column packing_categories text[] not null
    default array['Pre-trip', 'Packing list', 'On-trip'];

-- The one real trip already has its own in-use categories, not the starter
-- set — seeded to match what's actually there rather than forcing a rename.
update public.trips
set packing_categories = array['App', 'Packing list', 'Visa & Documents']
where id = 'fbaf7e9b-ac66-4158-a2f2-32cabc4745e1';

-- Optional per-item description (ROADMAP.md Milestone Q) — "which bag,"
-- "buy at the airport," that kind of detail.
alter table public.packing_items
  add column description text;

commit;
