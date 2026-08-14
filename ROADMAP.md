# Route & Stamps — Execution Roadmap

Milestones map directly to PRD v0.5 §15's phased plan, broken down into engineering-sized, independently verifiable increments. Each milestone should be a working, deployed state — not a branch that sits unmerged for weeks.

**Rule for every milestone:** it ends with something you can open on your phone and actually use, even if the next milestone hasn't started.

---

## M0 — Foundation

**Goal:** empty-but-real app. Auth works, one trip exists, nothing else does yet — and it's already wearing the real design system, not a placeholder.

- Repo scaffold (Next.js 16, TypeScript, Tailwind for layout only, ESLint/Prettier)
- Broadsheet vendored into `src/styles/broadsheet/`, `styles.css` imported globally, Source Serif 4 loaded via `next/font/google`, `@phosphor-icons/react` installed (see ARCHITECTURE.md §1b)
- Base `ui/` components built as thin wrappers around Broadsheet's classes (Button, Tag, Card, Dialog) — the foundation every later milestone's screens build on, so this has to happen first, not at the end
- Supabase project created; `schema.sql` applied as the first migration
- Google OAuth via Supabase Auth wired end-to-end (login → session → protected route)
- `profiles` row auto-created on signup (trigger, already in schema)
- One hardcoded trip seeded (Japan 2026) with the real stops from the trip spreadsheet
- Bottom-nav shell + empty states for all six tabs, styled per Broadsheet's `.nav` pattern
- Deployed to Vercel, pointed at Supabase — a real URL Sally can open
- GitHub Actions CI: lint + typecheck on every PR
- Supabase heartbeat cron (PRD §12c) — set up now, not later, so it's never forgotten

**Acceptance:** you and Sally can both log in with Google on your own phones and see the same empty trip shell — and it already looks like Broadsheet, not a default Tailwind app.

---

## M1 — Core loop: places & voting

**Goal:** the loop the whole product depends on (PRD §6.1) is real.

- Quick-add flow: paste name → Nominatim geocode (via Route Handler) → save
- Reverse-geocode + nearest-stop auto-assignment, with manual dropdown fallback
- Duplicate-place nudge (`nearby_places()` SQL function, already in schema)
- Route view: stop spine + place cards, matching the mockup structure (PRD Fig. 6)
- Graduated vote scale (5 levels), per-user, with consensus flag on mutual "Must go"
- Skip behavior: filterable, not removed
- Realtime: a vote or place added on one device appears on the other within ~2s (PRD §12c performance NFR) — this is the milestone to actually test that target against, not just assume it

**Acceptance:** you add a place on your phone; it appears on Sally's phone, unrefreshed, within a couple seconds. You both vote; a mutual "Must go" visibly flags.

---

## M1.5 — Smart place-name parsing

Slotted in after M1 rather than inside it, since M1 was already underway when this was scoped — additive, doesn't touch anything M1 already shipped. Full design in `ARCHITECTURE.md` §1c.

- Tier 1 heuristic parser (`lib/geo/parse-place-mention.ts`) in front of the existing Nominatim call — free, always on
- Tier 2 optional Claude-powered extraction (`/api/extract-place`), gated by `ENABLE_AI_PLACE_EXTRACTION` (default off), called only when Tier 1 is inconclusive
- Graceful fallback to Tier 1 / manual Inbox on any Tier 2 failure
- Anthropic Console per-key spend limit set as an independent backstop, before this ever gets toggled on for real

**Acceptance:** "KICC Nairobi, Kenya" resolves via Tier 1 alone with the toggle off. With the toggle on, a messier free-text blurb that Tier 1 can't parse successfully falls through to Tier 2 and still resolves. Killing the Anthropic API key (simulating a budget exhaustion) doesn't break adding a place — it just falls back silently.

---

## M2 — Media: embeds and photos

**Goal:** PRD §6.3.

- oEmbed Route Handler (Instagram + TikTok), with graceful failure for private/deleted posts
- Photo upload to Supabase Storage, access-controlled per PRD §12c
- Media slider component: photo + embed together when both exist, embed-only or photo-only otherwise
- Lazy-load embeds only on expand (PRD §12c performance NFR)

**Acceptance:** paste a real Instagram reel link, see it play inline; upload a photo to the same place, see both in a swipeable slider.

---

## M3 — Tips & Advice

**Goal:** PRD §6.4.

- Add-a-tip flow: category (free-tag input with suggestions), text or video link
- Category filter chips on the Tips list
- Optional link to a specific place

**Acceptance:** matches the Fig. 11 mockup's interaction shape — filterable, categorized, video badge visible where relevant.

---

## M4 — Budget & Payments

**Goal:** PRD §8, built as the ledger it's scoped to be — not a payments system.

- Cost-line CRUD, amounts stored as integer minor units (per `schema.sql`, per NFR)
- Cap vs. tally mode, set per trip
- Per-currency totals shown side by side, no conversion
- Booking status field, shared pattern with places
- Itinerary-linked logistics (hotel/meals/guide/flight fields on stops)

**Acceptance:** log a cost in JPY and one in KES on a KES-capped trip; confirm the KES total tracks the cap and the JPY total displays separately, not blended in.

---

## M5 — Packing list

**Goal:** PRD §9.

- Shared trip-essentials list + personal per-user lists
- International-trip flag auto-surfaces the visa/documents sub-checklist

**Acceptance:** you and Sally each have an independently checkable personal list; the shared list updates for both when either checks an item.

---

## M6 — Offline support

**Goal:** PRD §4b — the milestone most worth not rushing.

- Serwist service worker: precache app shell, runtime-cache map tiles for the trip's bounding box
- IndexedDB cache of last-synced trip snapshot (places, stops, tips)
- Offline write queue: adds/votes/costs made offline are captured locally, synced on reconnect, with a visible pending-sync indicator
- Current-position map pin (PRD §4b) — browser geolocation, foreground-only, never persisted

**Acceptance:** put the phone in airplane mode, confirm the map and all previously-synced places still render; add a place while still offline, confirm it syncs automatically the moment connectivity returns. This is also the milestone to run the PRD §15 launch-readiness check ("somewhere with genuinely bad signal, not just fast wifi") — don't mark this done from a desk.

---

## M7 — Notifications

**Goal:** PRD §6.5.

- In-app notification feed (table already in schema)
- Instant path: consensus-changing votes
- Digest path: routine adds, batched (a scheduled Edge Function or cron, not fired per-event)
- Email delivery for the digest (any transactional email free tier — e.g., Resend's free allowance)

**Acceptance:** a mutual "Must go" fires an in-app notification within seconds; five routine place-adds in one session produce one digest, not five.

---

## M8 — NFR hardening

**Goal:** the PRD §12c requirements that don't show up as a screen but need to actually be true before this ships for real use.

- Sentry wired up (Observability NFR)
- Invite-link security review: confirm tokens are genuinely unguessable, expiry enforced
- Accessibility pass: every status indicator has a non-color signal, not just a hue
- Full launch-readiness checklist (PRD §15) run end-to-end on both an Android and an iPhone

**Acceptance:** the PRD §15 checklist, all four items, checked off for real — not assumed.

---

## M9 — Design QA pass

**Goal:** this milestone changed shape now that Broadsheet arrived before M0 instead of after M8. It's no longer a re-skin from a placeholder — the app has been built against real tokens from the start — so this becomes a consistency audit instead: catch anywhere an earlier milestone drifted (a hardcoded color that should've been a token, a component that quietly diverged from `.card`/`.btn`/`.tag`, an icon that isn't Phosphor duotone), and resolve any Do/Don't rule from `broadsheet-guide.md` that got bent under milestone time pressure. Also the point to revisit the vote-scale color mapping proposed in ARCHITECTURE.md §1b once it's been live for a few real uses — confirm the cyan intensity ramp actually reads clearly at a glance, not just on paper.

**Acceptance:** a full click-through of all six tabs against `broadsheet-guide.md`'s Do/Don't list, with nothing flagged.

---

## Beyond M9 (platform vision — not scheduled)

Multi-trip accounts, request-based invites, push notifications, standalone tripless places, voting-visibility model for friend-group scale. These live in PRD §7/§14 as intentionally deferred — pick this roadmap back up with a new M10 when one of them is actually next.
