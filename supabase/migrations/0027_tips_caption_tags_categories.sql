begin;

-- Video tips had no free-text field at all (content_text only applies to
-- format 'text') — an optional caption/description alongside the link
-- (ROADMAP.md Milestone P).
alter table public.tips
  add column video_caption text;

-- Free-text, additive, separate from category (category is a strict single
-- select; a tip can carry more than one tag). No backing enum — same
-- open-ended shape as tip_categories/budget_categories/currencies.
alter table public.tips
  add column tags text[] not null default '{}';

-- "Question" and "Phrasebook" as selectable tip categories, no schema
-- change needed (category is already free text) — seeded as the column
-- default so any future new trip starts with these two rather than an
-- empty list (ROADMAP.md Milestone P). Only affects new inserts going
-- forward, per ALTER COLUMN ... SET DEFAULT semantics, so the one real
-- trip's existing row is updated separately below.
alter table public.trips
  alter column tip_categories set default array['Question', 'Phrasebook'];

update public.trips
set tip_categories = array(
  select distinct unnest(tip_categories || array['Question', 'Phrasebook'])
)
where id = 'fbaf7e9b-ac66-4158-a2f2-32cabc4745e1';

commit;
