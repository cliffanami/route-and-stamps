begin;

-- The client-side guard in useAutoFetchFunFacts (a useRef set) isn't
-- airtight against a genuine double-mount — React's dev-mode StrictMode
-- double-invokes effects on initial mount specifically to catch this
-- class of bug, and it did: two wikipedia-sourced rows landed for the
-- same stop. A partial unique index is the actual source of truth —
-- confirmed safe by construction, not just "shouldn't happen in
-- practice" (same standard as delete-stop's ON DELETE SET NULL check).
create unique index idx_fun_facts_wikipedia_per_stop
  on public.fun_facts (stop_id)
  where source = 'wikipedia' and stop_id is not null;

commit;
