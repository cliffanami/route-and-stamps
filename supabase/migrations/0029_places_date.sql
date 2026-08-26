begin;

-- Optional date on a place, independent of its stop's own start_date/
-- end_date range (ROADMAP.md Milestone W) — "what are we doing tomorrow"
-- answered from structured place dates, not just a stop's free-text
-- narrative. Not enforced against the stop's range; a mismatch is a UI
-- nudge at most, not a constraint.
alter table public.places
  add column date date;

commit;
