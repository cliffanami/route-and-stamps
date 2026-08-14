# Route & Stamps — Code Conventions

Read this alongside `ARCHITECTURE.md`. That document explains *what* the system is; this one governs *how code gets written* so the codebase stays consistent as milestones stack up over several Claude Code sessions.

---

## 1. Data access pattern (the one rule that matters most)

There are exactly two ways data moves in this app, and mixing them up is the most likely source of inconsistency:

1. **Direct Supabase client calls** for all CRUD — reading/writing places, votes, budget lines, tips, packing items. Security is enforced by RLS (`schema.sql`), not by application code. If you find yourself writing a Route Handler that just forwards a Supabase query, stop — call Supabase directly from the component/hook instead.
2. **Route Handlers** *only* for the three things that must not run in the browser: the Nominatim proxy, the oEmbed proxy, and invite-token resolution (needs to run before the visitor has a session). Nothing else gets a Route Handler by default.

When in doubt: **can this row be read/written under RLS as the current user? Then it's a direct Supabase call, not an API route.**

---

## 2. State management pattern

- **Server state** (anything from Supabase) → TanStack Query, one hook per entity in `lib/queries/`. Query keys follow `[entity, tripId, ...filters]`, e.g. `['places', tripId]`.
- **Realtime bridge**: a single `use-realtime-subscription.ts` hook per subscribed table, invalidating the relevant TanStack Query key on `INSERT`/`UPDATE`/`DELETE` events rather than manually patching the cache — simpler to reason about, and correct-by-construction since it re-fetches from the same RLS-secured source.
- **Offline writes**: mutations go through a wrapper (`lib/offline/sync-queue.ts`) that attempts the Supabase call, and on failure (offline) queues it in IndexedDB with an optimistic local update. A background listener retries the queue on `online` events.
- **Client-only UI state** (open/closed modals, active filter chip, form draft) → component state or `useReducer`. Don't reach for Context unless the state is genuinely needed three or more components apart from where it originates (e.g., current trip ID, current user profile — both reasonable Context candidates).
- **No Redux/Zustand.** If a global client store starts to feel necessary, that's a signal to check whether the data in question should actually be server state (TanStack Query) instead.

---

## 3. Validation

- Every entity that crosses a form boundary gets one Zod schema in `lib/validation/`, imported by **both** the React Hook Form resolver and the Supabase mutation (parse before insert). One schema, two enforcement points — not two schemas that can drift.
- Route Handler request bodies are Zod-parsed before use; a failed parse returns `400` with the Zod error formatted, never a raw stack trace.

---

## 4. Error handling

- **User-facing errors** (failed mutation, offline, validation failure): a toast/inline message with plain language, never a raw error object rendered to the screen.
- **Unexpected errors** (anything not explicitly handled): caught by a route-level `error.tsx` boundary, reported to Sentry with the trip ID and user ID attached as context, shown a generic "something went wrong" state with a retry action.
- **Offline vs. genuine failure**: distinguish these in the UI. A failed-because-offline mutation shows "saved, will sync" (queued); a failed-because-actually-broken mutation shows a real error. Conflating the two undermines the whole point of the offline design (PRD §4b).
- Route Handlers return structured errors: `{ error: { code: string, message: string } }`, consistent HTTP status codes (`400` validation, `401` unauthenticated, `403` not a trip member, `502` upstream — e.g. Nominatim — unavailable).

---

## 5. Component conventions

- **`params`/`searchParams` are async (Next.js 16).** Every dynamic route (`[tripId]`, `[placeId]`, `[token]`) takes `params: Promise<{...}>` and requires `await params` — no compatibility shim exists anymore, so a synchronous destructure throws at request time, not just a deprecation warning. See ARCHITECTURE.md §1d.
- **Server Components by default.** Add `'use client'` only when the component needs interactivity, browser APIs (geolocation, IndexedDB), or a hook that requires it (TanStack Query, React Hook Form). Content-heavy, read-only views (Tips list, Route view's static parts) should be Server Components wherever possible — real payload-size wins for a mobile-first app.
- One component per file; colocate a component's own types directly above it rather than in a separate types file unless the type is shared across features.
- Props interfaces named `{ComponentName}Props`.
- Tailwind is layout-only (flex/grid/spacing/breakpoints). Colors, type, radius, shadow, and component structure come from Broadsheet's classes and CSS variables — never a Tailwind color/spacing value for those. See §5b.

---

## 5b. Design system (Broadsheet)

`design-system/broadsheet-guide.md` is the full written guide — read it once, in full, before the first UI-building session. The rules below are the ones most likely to get silently violated by default framework instincts:

- **One typeface, no exceptions.** Source Serif 4 for everything — headings and body alike, `var(--font-heading)` / `var(--font-body)`. Don't reach for a sans-serif for "just this one label."
- **No boxes or dividers for layout.** Hierarchy comes from the type scale and whitespace. `.card` is reserved for genuinely discrete list items (a place, a tip, a budget line — all legitimate) — never used as a generic layout container or section wrapper.
- **One accent does the interactive work.** Cyan (`--color-accent`) for buttons, links, focus rings, active states. Magenta (`--color-accent-2`) is the rare second accent — never both accents in one small component. See ARCHITECTURE.md §1b for how this resolves for the 5-level vote scale specifically, since that's the one place in this app where "which color means what" needs real thought, not a default.
- **States are themed, not browser default.** Every interactive element gets a real `:hover`/pressed state from the accent ramp and a `:focus-visible` ring — `styles.css` already implements this for `.btn`/`.input`/`.radio`/`.seg`; extend the same pattern for any new interactive component rather than leaving default outlines.
- **Icons are Phosphor, duotone weight, no exceptions.** `@phosphor-icons/react`, imported with `weight="duotone"` — not the default/thin/bold weights, not a different icon set for convenience.
- **Tag component maps directly onto our status fields** — booking status, budget status, and (per the mapping in ARCHITECTURE.md §1b) vote level all use `.tag` with the appropriate accent/neutral variant. Don't invent a parallel "status pill" component; `.tag` already is that component.

---

## 6. Naming

- Files: `kebab-case.ts` / `kebab-case.tsx`, except component files which are `PascalCase.tsx` matching the exported component name.
- Database columns: `snake_case` (Postgres convention); mapped to `camelCase` at the TypeScript boundary via the generated `database.types.ts` — don't hand-write duplicate types that can drift from the schema.
- Branches: `{milestone}/{short-description}`, e.g. `m1/vote-scale-component`.
- Commits: Conventional Commits (`feat:`, `fix:`, `chore:`, `refactor:`) — makes it easy to scan history milestone-by-milestone later, and Claude Code follows this convention well when it's stated once in `CLAUDE.md`.

---

## 7. Testing

Given the zero-cost constraint, everything here is free/open-source:

- **Unit**: Vitest, for pure logic — `haversine`, nearest-stop matching, Zod schemas, currency-minor-unit math. This is where correctness actually matters most (PRD §12c data-correctness NFR); don't skip these even though the app is small.
- **Component**: React Testing Library, for the vote scale, media slider, and duplicate-nudge — the components with real interaction logic worth locking down.
- **E2E**: Playwright, for exactly two flows worth the maintenance cost of an E2E suite — add-a-place-and-vote (M1) and the invite flow (redeem link → join trip). Everything else, rely on unit + component tests and manual milestone acceptance checks.
- Don't chase coverage percentage. Test the things that are annoying to verify by hand (currency math, RLS-adjacent logic) and skip exhaustive tests on simple presentational components.

---

## 8. What "done" means for a milestone

Before moving to the next item in `ROADMAP.md`:

1. Deployed to the real Vercel URL, not just running locally.
2. The milestone's stated acceptance criterion actually checked on a real phone, not assumed from the browser dev-tools mobile emulator.
3. `lint` and `typecheck` clean in CI.
4. No `TODO` left in a code path the milestone claims is finished.
