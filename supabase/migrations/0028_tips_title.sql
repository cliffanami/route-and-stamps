begin;

-- A text tip's content_text is both its heading and body — no way to scan a
-- list of tips at a glance (ROADMAP.md Milestone R). Optional, so existing
-- tips stay valid with no title.
alter table public.tips
  add column title text;

commit;
