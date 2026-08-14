# Route & Stamps — Technical Architecture

**Status:** Approved for build · **Source of truth:** PRD v0.5
**Author role:** Principal Engineer pass on an already-decided product spec — this document turns PRD decisions into an actual buildable system, not a re-litigation of them.

---

## 0. Ground rules this architecture is optimizing for

Pulled straight from the PRD because they constrain every choice below:

1. **$0/month at MVP scale** (PRD §12c) — every service must have a free tier that comfortably covers two users, and the architecture must not accidentally create a paid dependency.
2. **Two users at launch, designed not to be rebuilt at ten** — RLS-based multi-tenancy from day one, even though v1 hardcodes one trip.
3. **Mobile-first PWA, installable on iOS + Android** (PRD §12b) — no native codebases.
4. **Offline-capable for maps and presaved data** (PRD §4b) — this is a real architectural constraint, not a nice-to-have; it rules out anything that assumes an always-on connection.
5. **No payment processing, ever** (PRD §8) — the budget module is a ledger. This simplifies the architecture by removing an entire compliance surface (PCI, KYC) that a naive reading of "finance module" might otherwise imply.

---

## 1. Tech stack

| Layer | Choice | Why this, not the alternatives |
|---|---|---|
| **Frontend framework** | Next.js 16 (App Router), TypeScript, React 19 | Server Components cut client JS for content-heavy views (Route, Tips); Route Handlers give us the 2–3 server-side endpoints we actually need without standing up a separate backend. The realistic alternative — Vite + React Router SPA — would need a hand-rolled backend for the geocode/embed proxies anyway, for no real benefit at this scale. |
| **Styling** | Broadsheet design system (vendored `styles.css` + `theme.json`) for color/type/component classes; Tailwind CSS v4 for layout-only utilities (flex/grid/spacing/breakpoints) | Broadsheet ships as its own plain-CSS token sheet and documented component classes (`.btn`, `.card`, `.tag`, `.field`, `.dialog`…) — its own guide is explicit that consuming projects should use those classes and CSS custom properties directly rather than re-deriving them into a parallel system. Re-expressing the same tokens as a Tailwind theme config would be exactly the "inventing parallel ones" the guide warns against, and risks drifting from the source of truth. Tailwind stays for what Broadsheet's CSS doesn't cover — responsive layout utilities — not for color or component styling. |
| **Icons** | `@phosphor-icons/react`, duotone weight only | Locked by `theme.json` (`iconSet: "phosphor-duotone"`) and reinforced in the written guide — not a free choice per screen. |
| **Type** | Source Serif 4 (Google Fonts), loaded via `next/font/google` | Same typeface for heading and body, per the design system — no sans-serif anywhere in UI chrome. `next/font` avoids the render-blocking `@import` the vendored CSS uses by default; swap it at integration time (see §3). |
| **PWA / offline** | Serwist (`@serwist/next`) | The maintained successor to `next-pwa`, which is archived. Serwist is what Next.js's own PWA guide now points to, integrates cleanly with the App Router build, and gives typed service-worker code instead of a black-box config object — matters here because our offline requirement (PRD §4b) is specific enough (tile caching, queued writes) that we'll be writing real service-worker logic, not just precaching. |
| **Backend** | Next.js Route Handlers (serverless, on Vercel) | Only 3 endpoints need a server at all: geocode/reverse-geocode proxy, oEmbed proxy, and the invite-token resolver. Everything else is direct Supabase client calls secured by RLS — see §4 for why we deliberately don't build a full REST/GraphQL layer on top of Postgres. |
| **Database** | Supabase Postgres | Managed Postgres + Auth + Realtime + Storage as one product means one free tier to track, not four. Plain `float8` columns for lat/lng rather than PostGIS — see decision log (§5). |
| **Auth** | Supabase Auth, Google OAuth provider | Matches PRD §12 exactly; Supabase Auth issues a JWT that RLS policies read directly (`auth.uid()`), so auth and authorization share one mechanism instead of two. |
| **Realtime sync** | Supabase Realtime (Postgres logical replication) | This *is* the collaborative loop (PRD §6.1) — a place added by one person needs to appear on the other's screen without a manual refresh. Realtime subscriptions feed straight into the client cache (§4). |
| **File storage** | Supabase Storage | Place photos (PRD §6.3). Access-controlled buckets, not public URLs (PRD §12c security requirement). |
| **Geocoding** | OpenStreetMap Nominatim (proxied) | Free, keyless, by explicit earlier decision to avoid any Google Cloud billing account. |
| **Embeds** | Instagram/TikTok oEmbed (proxied) | Free, keyless, per PRD §6.3/§6.4. |
| **Maps** | Leaflet + `react-leaflet`, OSM tile layer | Free, no API key, works with a service-worker cache strategy for offline tiles (PRD §4b) in a way a metered tile provider wouldn't let us do without a paid plan. |
| **Server state / data fetching** | TanStack Query | Bridges Supabase's realtime push events into a client-side cache with proper loading/error states, retry, and optimistic updates for the offline write queue (§4b). Plain `useEffect` + `useState` data-fetching doesn't hold up once realtime + offline-queue + optimistic UI are all in play at once. |
| **Forms & validation** | React Hook Form + Zod | Same Zod schemas validate on the client (form) and on the server (Route Handler input) — one source of truth for "what does a valid Place look like." |
| **Local/offline persistence** | IndexedDB via `idb-keyval` | Minimal API surface for what we actually need: cache the last-synced trip snapshot and queue pending writes. Dexie.js is the heavier alternative; not justified at this data volume. |
| **Error monitoring** | Sentry (free tier) | Directly satisfies the Observability NFR (PRD §12c) — "silently broken while actually in Japan" is the failure mode being designed against. |
| **Hosting** | Vercel (frontend + Route Handlers), Supabase Cloud (everything else) | Both have real, sustainable free tiers (not trials) and are the reference deployment target for this exact stack — least friction, least yak-shaving. |
| **CI** | GitHub Actions | Free for public/private repos at this scale; also hosts the Supabase keep-alive heartbeat (PRD §12c) as a scheduled job — one tool doing two jobs. |

### Explicitly rejected

- **PostGIS** — real distance/geospatial queries would want it, but at "a few hundred places, one trip" scale, a Haversine function in a Postgres `plpgsql` function (see `schema.sql`) does the job with zero extra infrastructure. Revisit if the platform vision (multi-trip, many places) ships.
- **A hand-rolled REST or GraphQL API layer** — see §4. PostgREST (which ships inside Supabase) already *is* that layer for CRUD; building another one on top would be pure duplication.
- **Redux / Zustand for server state** — TanStack Query owns server state; there's little enough client-only UI state (open modals, active tab) that Context or component state covers it without a global store.
- **Re-deriving Broadsheet's tokens into Tailwind's theme config** — see the Styling row above. Two token systems for the same colors is how they drift.

---

## 1d. Next.js version note

This document targets **Next.js 16**, not 15 — worth being explicit since my own knowledge cutoff predates 16's release, and a repo running current `create-next-app` will already reflect this. Two breaking changes land directly on code this document specifies:

- **`params`/`searchParams` are hard-async.** 15 shipped these as a soft change with a compatibility shim; 16 removed the shim. Every dynamic route in §3's project structure (`[tripId]`, `[placeId]`, `[token]`) must `await params` — a synchronous destructure throws, it doesn't just warn.
- **The root middleware file is `proxy.ts`, not `middleware.ts`.** The project structure in §3 didn't originally show this file explicitly; it's added there now. Don't confuse this with `lib/supabase/middleware.ts` — that's an internally-named helper function Next.js doesn't treat specially, and its name doesn't need to change; `src/proxy.ts` is the one that imports and calls it.

If `node_modules/next/dist/docs/` (or the AGENTS.md block Next.js itself generates) ever disagrees with a specific API detail in these documents, treat the local docs as authoritative — they reflect the actual installed version; this document reflects my training data plus this one correction.

---

## 1b. Design system integration (Broadsheet)

The design handoff (`design-system/` in this bundle: `styles.css`, `theme.json`, `print-plates.js`, `broadsheet-guide.md`) is high-fidelity and prescriptive — its own guide says to use its exact values and classes rather than approximating. Two things worth knowing before M0:

- **Vendor the files as-is** into `src/styles/broadsheet/` (see §3) and import `styles.css` once, globally, in the root layout. Don't copy individual values out of it into component code.
- **`print-plates.js` is optional at MVP scale.** It powers the `.cmyk` four-plate photo-separation treatment used in the system's showcase/deck contexts — striking, but not something a place photo or map pin needs. Use `.halftone` (the simpler dot-screen, also in `styles.css`, no JS required) for interface imagery instead, and skip importing `print-plates.js` unless a specific screen calls for the fuller treatment later.
- **The reference prototype's four tabs don't map onto ours.** `TripApp.dc.html` demonstrates Trip/Discover/Chat/Split; this product has Route/Map/Add/Tips/Budget/Packing. Trip→Route and Split→Budget are close enough to study directly (view source on the matching sections); Map, Add, Tips, and Packing have no reference screen and need original composition against the same tokens and component classes — not invented parallel styling.
- **The vote scale needs a deliberate color mapping, not a default.** Broadsheet's rule is one accent (cyan) for interactive elements, the second (magenta) used rarely and never alongside the first in one small component. Five vote levels plus Skip don't fit that as five different colors. Recommended mapping, worth confirming rather than silently building: **Interested → Must go** as an intensity ramp on the cyan accent scale (`--color-accent-200` through `--color-accent-700` — the ramp exists in the tokens specifically for this kind of step-by-step emphasis), and **Skip** takes the magenta accent (`--color-accent-2`) as its one deliberate, separate-component use of the second accent.

---

## 1c. Place-name resolution — cascading, free-first

Added after M1 was already underway (see `ROADMAP.md` M1.5) — deliberately additive, doesn't touch the `places` schema, the existing Nominatim Route Handler's contract, or anything realtime/vote-related. Only changes *how a place gets its name and coordinates* before the existing flow takes over.

**The problem:** a person pastes a description like "posted a video about KICC Nairobi, Kenya" — one blurb mixing the place, its location, and often some "why" commentary. Asking them to manually split that into a clean search query is friction the core loop (PRD §6.1) shouldn't have.

**Tier 1 — free, always on, no toggle:** a local heuristic parser (`lib/geo/parse-place-mention.ts`, pure logic, no external call) recognizes common patterns — `<Name>, <City>, <Country>`, `<Name> in <City>` — and passes the cleaned result straight to the **existing** Nominatim search Route Handler. No new endpoint; this is a preprocessing step in front of a call that already exists. Nominatim's own fuzzy matching does real work here too — a reasonably-formed free-text query often resolves without any extraction at all.

**Tier 2 — optional, toggled, cascading fallback only:** when Tier 1 returns nothing or multiple ambiguous matches, and only then, a new Route Handler (`/api/extract-place`) calls the Claude API to separate name from location and expand abbreviations ("KICC" → "Kenyatta International Convention Centre"). Gated by `ENABLE_AI_PLACE_EXTRACTION` (env var, default **off**) — flip without a redeploy. This is never the first call made; it's a fallback for the minority of inputs Tier 1 can't parse, which keeps real cost low even with the toggle on.

**Resilience, regardless of the toggle:** if the Tier 2 call errors, times out, or the API key hits its spend limit, catch it and fall back to Tier 1's best-effort result or the existing manual Inbox flow — same graceful-degradation philosophy as offline handling (`CONVENTIONS.md` §4), never a hard failure on the core add-a-place loop.

**Cost backstop:** independent of the app-level toggle, set a hard per-key spend limit in the Anthropic Console — a real cutoff, not just an alert. Two independent safety nets, not one.

---

## 2. System architecture

```
┌─────────────────────────────┐
│   Mobile Web App (PWA)      │
│   Next.js 16 · App Router   │
│   Serwist service worker    │
└───────────┬──────────────────┘
            │
   ┌────────┼─────────────────────────────┐
   │        │                             │
   ▼        ▼                             ▼
Google    Supabase                  Next.js Route
OAuth     Postgres+Realtime+Storage Handlers (server-only)
(sign-in) (direct client calls,       │
          secured by RLS)             ├──▶ Nominatim (geocode/reverse)
                                       └──▶ Instagram/TikTok oEmbed

Supabase → on INSERT/UPDATE → Realtime → subscribed clients
                             → (digested) → Notification dispatch (Edge Function / cron)
```

**The load-bearing architectural decision:** most reads and writes go **directly from the browser to Supabase**, not through our own API. A Route Handler only exists where the code needs to do something the browser shouldn't be trusted with (calling an external API without exposing rate limits/abuse surface to the client) — geocoding, reverse-geocoding, oEmbed lookups, and resolving an invite token before the recipient has a session. Everything else — creating a place, casting a vote, logging a budget line — is a Supabase client call, and correctness is enforced by RLS policies in Postgres, not by application code. This cuts the amount of backend code roughly in half versus a conventional REST API, without weakening security, because Postgres is the actual source of truth for who can do what.

---

## 3. Project structure

```
route-and-stamps/
├── src/
│   ├── app/
│   │   ├── (auth)/
│   │   │   └── login/page.tsx
│   │   ├── (app)/
│   │   │   ├── trips/
│   │   │   │   ├── page.tsx                  # My Trips list
│   │   │   │   └── [tripId]/
│   │   │   │       ├── layout.tsx             # bottom-nav shell
│   │   │   │       ├── route/page.tsx         # §6.1 Route view
│   │   │   │       ├── map/page.tsx           # §4b Map (offline-capable)
│   │   │   │       ├── add/page.tsx           # §6.1 Add a Place
│   │   │   │       ├── tips/page.tsx          # §6.4 Tips & Advice
│   │   │   │       ├── budget/page.tsx        # §8 Budget & Payments
│   │   │   │       ├── packing/page.tsx       # §9 Packing list
│   │   │   │       ├── members/page.tsx       # §6.2 Trip members / invite
│   │   │   │       └── places/[placeId]/page.tsx  # §6.3 Place detail
│   │   │   └── profile/page.tsx
│   │   ├── invite/[token]/page.tsx            # public invite-resolution route
│   │   ├── api/
│   │   │   ├── geocode/route.ts
│   │   │   ├── reverse-geocode/route.ts
│   │   │   ├── embed/route.ts
│   │   │   └── invites/[token]/resolve/route.ts
│   │   ├── manifest.ts                        # PWA manifest
│   │   ├── sw.ts                               # Serwist service worker entry
│   │   └── layout.tsx
│   ├── proxy.ts                    # Next.js 16's root middleware convention (renamed from
│   │                                 # middleware.ts) — imports lib/supabase/middleware.ts's
│   │                                 # session-refresh helper; see §1d
│   ├── components/
│   │   ├── ui/                # thin wrappers around Broadsheet classes (Button, Tag, Card, Dialog…)
│   │   ├── route/              # RouteSpine, StopCard, PlaceRow
│   │   ├── map/                 # MapView, CurrentPositionMarker, OfflineTileLayer
│   │   ├── places/               # PlaceForm, MediaSlider, VoteScale, DuplicateNudge
│   │   ├── tips/                  # TipCard, CategoryFilter
│   │   ├── budget/                 # CostLineRow, BudgetSummary
│   │   └── packing/                 # ChecklistItem
│   ├── styles/
│   │   └── broadsheet/                # vendored as-is from the design handoff — don't edit values here
│   │       ├── styles.css               # imported once, globally, in the root layout
│   │       └── theme.json                # reference copy; source of truth for the token values
│   ├── lib/
│   │   ├── supabase/
│   │   │   ├── client.ts        # browser client
│   │   │   ├── server.ts         # server component / Route Handler client
│   │   │   └── middleware.ts      # session refresh
│   │   ├── queries/                # TanStack Query hooks, one file per entity
│   │   │   ├── use-places.ts
│   │   │   ├── use-votes.ts
│   │   │   ├── use-budget-lines.ts
│   │   │   └── use-realtime-subscription.ts
│   │   ├── geo/
│   │   │   ├── haversine.ts
│   │   │   └── nearest-stop.ts
│   │   ├── offline/
│   │   │   ├── sync-queue.ts     # queued-write pattern, PRD §4b
│   │   │   └── cache.ts           # idb-keyval wrappers
│   │   └── validation/             # Zod schemas, shared client+server
│   │       ├── place.schema.ts
│   │       ├── budget-line.schema.ts
│   │       └── tip.schema.ts
│   └── types/
│       └── database.types.ts       # generated: `supabase gen types typescript`
├── supabase/
│   ├── migrations/                  # numbered SQL migrations (see schema.sql as migration 0001)
│   └── config.toml
├── public/
│   └── icons/                        # PWA install icons
├── .github/workflows/
│   ├── ci.yml                         # lint, typecheck, test on PR
│   └── supabase-heartbeat.yml          # PRD §12c free-tier keep-alive
├── CLAUDE.md                            # project-level instructions for Claude Code
├── ARCHITECTURE.md                       # this file
├── ROADMAP.md
├── CONVENTIONS.md
└── package.json
```

**Why feature-first inside `components/`, not type-first:** a change to "how a place is voted on" touches `VoteScale`, `use-votes.ts`, and `votes` RLS policy — feature-first folders keep those conceptually close even though they're technically different layers, which matters more for a small team (of two, working solo on this) moving through the roadmap module-by-module than a strict layered architecture would.
