# Route & Stamps

Collaborative trip-planning PWA for two people. See `ARCHITECTURE.md`,
`CONVENTIONS.md`, and `ROADMAP.md` before making changes.

## Setup

1. `npm install`
2. Copy `.env.example` to `.env.local` and fill in the Supabase project URL/anon key.
3. `npm run dev` — [http://localhost:3000](http://localhost:3000)

## Scripts

- `npm run dev` / `npm run build` / `npm start`
- `npm run lint` / `npm run typecheck` / `npm run format`
- `npm test` (Vitest) / `npm run test:e2e` (Playwright)
- `npm run supabase -- <command>` (local Supabase CLI, no global install needed)

## Status

M0 — Foundation (see `ROADMAP.md`). Not yet deployed; Broadsheet design system
and Supabase project are pending.
