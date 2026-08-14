# Route & Stamps

Collaborative trip-planning PWA for two people (v1), architected to extend to
friend groups later. Full product spec: PRD v0.5 (not in this repo — summarized
in ARCHITECTURE.md; ask if you need a specific PRD section clarified).

## Before writing code
Read ARCHITECTURE.md, CONVENTIONS.md, and the relevant milestone in ROADMAP.md.
Don't re-derive architectural decisions already made in those files — follow them.

## Stack
Next.js 16 (App Router) + TypeScript, Supabase (Postgres/Auth/Realtime/Storage),
Serwist for PWA/offline, TanStack Query, React Hook Form + Zod. Full rationale
in ARCHITECTURE.md §1.

## Design system — Broadsheet
Vendored in design-system/ and src/styles/broadsheet/. This is a real, high-fidelity
system, not a placeholder — use its exact tokens and documented classes
(.btn/.card/.tag/.field/.dialog etc.), never approximate a color or spacing value.
Tailwind is layout-only; color/type/component styling comes from Broadsheet.
Full rules in CONVENTIONS.md §5b and design-system/broadsheet-guide.md — read the
guide in full before the first UI session. The three easiest rules to violate by
default framework instinct: one serif typeface everywhere (no sans-serif), no
boxes/dividers for layout (.card only for genuinely discrete list items), and
Phosphor duotone icons exclusively.

## The one rule that matters most
Direct Supabase client calls for all CRUD, secured by RLS. Route Handlers ONLY
for: Nominatim proxy, oEmbed proxy, invite-token resolution. See CONVENTIONS.md §1
before adding any new API route — check whether it should just be a Supabase call.

## Current milestone
See ROADMAP.md. Work one milestone at a time; don't start the next until the
current one's acceptance criterion is met. State which milestone you're on at
the start of a session if it's not obvious from the branch name.

## Conventions
Full detail in CONVENTIONS.md. Highlights Claude should apply without being
reminded: Zod schema per entity shared between form + mutation; Server
Components by default; kebab-case files except PascalCase components;
Conventional Commits; currency stored as integer minor units, never float.

## Testing expectations
Vitest for logic (haversine, currency math, schemas), RTL for interactive
components (vote scale, media slider), Playwright for exactly two flows
(add-place-and-vote, invite redemption). Don't over-test simple presentational
components.

## When something in the PRD or design system is ambiguous
Flag it and propose a specific default rather than blocking — same standard
the PRD itself was written to. The vote-scale color mapping (ARCHITECTURE.md
§1b) is the one design decision that needed this treatment already; treat any
similar gap in Broadsheet's coverage the same way. Don't silently guess on
anything touching money, auth, or RLS policies; ask.