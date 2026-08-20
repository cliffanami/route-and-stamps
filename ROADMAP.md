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
- Tier 2 optional Claude-powered extraction (`/api/extract-place`), gated by `ENABLE_AI_PLACE_EXTRACTION` (default off), called only when Tier 1's Nominatim search returns zero results (ambiguous-multiple-match handling explicitly deferred — see `ARCHITECTURE.md` §1c)
- Graceful fallback to Tier 1 / manual Inbox on any Tier 2 failure
- Anthropic Console per-key spend limit set as an independent backstop, before this ever gets toggled on for real

**Acceptance:** "KICC Nairobi, Kenya" resolves via Tier 1 alone with the toggle off, needing no extraction at all — Nominatim's own matching handles it. With the toggle on, an input that returns zero Nominatim results falls through to Tier 2 and resolves. Killing the Anthropic API key (or simply leaving the toggle off, which is the default) doesn't break adding a place — it just falls back to Tier 1's result or the manual Inbox path silently.

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

## Post-M9 — live usage feedback

The milestones below came from actual usage across both phones, not new speculative scope. **Named, not numbered** — the live build has moved past M9 by the time this was written, so let Claude Code assign the real M-number against whatever's actually next when you hand one of these over, same pattern as M1.5/M1.6.

Regrouped once against a real implementation plan (superseding an earlier draft sequence written before that plan existed): dates turned out to belong with scheduling, not with reordering/route-line; Web Share Target turned out to belong with pattern-completeness, not standalone; check-in was deliberately split out and deferred, with your explicit sign-off, so "Estimated arrival" ships as a complete, independently-testable unit rather than waiting on a "Confirmed" contrast state that doesn't exist yet.

---

### A — Settings split

**Goal:** stop settings from being scattered — budget-cap config currently lives as a panel bolted onto the Budget page (its own code comment already flags this as a placement gap), and `(app)/profile/page.tsx` exists but is orphaned — nothing in the app links to it.

Shipped: new `trips/[tripId]/settings` route (reachable via a Gear icon in the trip layout's top-right icon row, alongside Members/notifications) with trip name (editable), budget-cap amount + currency (moved off the Budget page — a `text-muted` note there now points back to Settings), and trip `description` (new column) + `start_date`/`end_date` (existed since `0001_init.sql`, never surfaced until now). Description shows read-only on the Route page header. Profile page filled out (editable display name; avatar shown, not upload) and linked from Settings' new "Account" section.

Also shipped, as a fast-follow once Settings existed: currency/tip-category/budget-category fields moved from free text to strict selects, backed by simple per-trip text arrays (`currencies`, `tip_categories`, `budget_categories` on `trips`) editable via a new `TagListEditor` in a "Currencies & categories" section on the same Settings page — a deliberately lighter version of the managed-list idea below (no rename/archive, no IDs) since a handful of names grouped by plain text isn't a scale problem at this app's real size.

**Deferred, explicit call:** stop order (waits on Milestone C existing) and the *full* managed-table version of categories (real IDs, rename, archive/soft-delete, historical-record integrity on rename) — a genuinely bigger schema change than the array-based version that shipped, worth doing only if rename-integrity turns out to matter in practice.

**Acceptance:** budget cap can be changed from Trip Settings and the Budget page reflects it with nothing duplicated; a trip's description and date range can be set from Settings and the description is visible on the Route page without opening Settings again; Profile is reachable via an actual link in the app, not just a direct URL.

---

### B — Pattern completeness (includes Web Share Target)

**Goal:** five places where a pattern already exists but doesn't yet reach somewhere it should — plus Web Share Target, grouped in here rather than standalone since it's the same shape: extending something to a place it doesn't reach yet.

- **Join notification, both directions.** `redeem_invite()` inserts into `trip_members` with `on conflict ... do nothing` — re-clicking an already-used invite is meant to be a no-op, so the notification has to be gated on *genuine* new membership (checked before insert), not fired on every call. Every other trigger in the app notifies other members about an actor's action, excluding the actor; welcoming the joiner (a direct insert to their own feed) is a deliberate, singular inversion of that rule — paired with the standard other-direction call telling existing members someone joined, so it's not one-sided. (New-place/new-tip notifications for a member who joined partway through already work automatically — `notify_place_added`/`notify_tip_added` query `trip_members` live at insert time. Confirmed, no change needed there.)
- **Vote + proposer on the actual place detail page.** Confirmed this exists today only on `PlaceRow` (the Route page's accordion row) — `PlaceDetail` has none of it. Porting, not building fresh. Surfaced a small real refactor along the way: the "who's the current user" lookup was already duplicated in two places (`RouteSpine`, `NotificationBell`); porting this pattern would've made a third copy, so it's worth pulling into one shared `useCurrentUserId()` hook instead. "Proposed by" needs no new query — `place.added_by` resolves against the trip-members list already being fetched for the vote display.
- **Budget-per-place.** Nullable `place_id` on `budget_lines` (additive, existing rows get null). "Add a cost" launchable pre-filled from a place page. A place's own cost list is a client-side filter of data `useBudgetLines` is already fetching unfiltered — no new query.
- **Tips scoped to a stop.** Nullable `related_stop_id`, independent of the existing `related_place_id` — either, both, or neither can be set. Mirrors an existing `<select>` pattern already used twice elsewhere (the place picker, `PlaceForm`'s own nearest-stop picker) — a third instance, not a new one. Confirmed no string-matching workaround existed to clean up first; purely additive.
- **Invite link as its own tab.** Reuses the segmented-control style already used elsewhere (vote scale, the budget cap/tally toggle) — no new route, no new UI pattern.
- **Web Share Target, Android only.** Not a runtime capability to detect and branch on — it's a manifest key (`share_target`) that unsupported platforms silently ignore. The app simply never appears in iOS's share sheet; nothing to conditionally hide in app code, no tension with "installable on iOS + Android" as a whole, since only one shortcut is missing on one platform. Lands in a pre-filled Add-a-Place form (source URL only — name stays blank for the person to fill in; no oEmbed auto-fetch, matching the Add flow's existing behavior).

**Acceptance:** redeeming an invite once notifies both the joiner and existing members exactly once each; re-visiting an already-used link fires nothing further; a place's detail page shows the same vote scale + peer votes + proposer the Route page's card already shows; a cost can be logged directly from a place page; a tip can be attached to a stop with no specific place in mind; sharing a post from Instagram/TikTok on Android lands pre-filled in Add-a-Place, and the option doesn't appear at all on iOS.

---

### C — Route cluster (reordering, transport-mode line)

**Goal:** narrower than originally scoped — real dates now ship as part of Milestone D, so this picks up once D is live and stop dates already exist. What's left: making the route itself reorderable and visually readable as a journey.

Fully scoped in a dedicated session (2026-08-20) so the next build session can start straight into implementation — every decision below is settled, not open.

**Reordering — real drag, not buttons.** Broadsheet has no drag library today and touch drag-and-drop is genuinely hard to hand-roll well on mobile, so this adds `@dnd-kit/core` + `@dnd-kit/sortable` + `@dnd-kit/utilities` (small, touch-friendly, accessible) rather than a hand-rolled pointer-event implementation — explicit call, confirmed rather than defaulted, since it's the one new dependency in this milestone.
- `RouteSpine`'s stop list wraps in `DndContext` + `SortableContext` (`verticalListSortingStrategy`); each `StopCard` becomes sortable via `useSortable({ id: stop.id })`.
- A dedicated grab-handle icon (Phosphor `DotsSixVertical`, duotone) in `StopCard`'s header is the drag target — *not* the whole card, since the card already has a tap-to-expand/collapse gesture that a full-card drag handle would conflict with.
- Persistence: the `unique (trip_id, order_index)` constraint is a plain (non-deferrable) unique index today, not a deferrable constraint — rather than converting it, add a `reorder_stops(p_trip_id uuid, p_ids uuid[], p_orders int[])` `SECURITY INVOKER` RPC function (RLS already governs `stops` UPDATE, same as every other table) that does one set-based `UPDATE ... FROM (VALUES ...)` — Postgres validates uniqueness only after the full statement completes, so this is safe without any constraint change. Matches the existing pattern of RPC functions for anything needing atomicity the PostgREST client API can't express (`nearby_places()`, `redeem_invite()`, `check_scheduled_arrivals()`). New `useReorderStops(tripId)` mutation calls it via `supabase.rpc(...)` with the full reordered id list on every drag-end, then invalidates `["stops", tripId]`.

**Transport mode — user-configured per trip, not a fixed enum.** Explicit call: the original "`transport_mode` enum" framing doesn't fit — modes vary by trip (this one needs cycling within some stops/cities, alongside train/bus/flight/etc.), and a Postgres enum's `ALTER TYPE ... ADD VALUE` friction (can't run in the same transaction that uses the new value, per ARCHITECTURE.md §1d) makes a fixed enum the wrong tool anyway. Reuses the exact pattern Milestone A's currency/category follow-up just established:
- `trips.transport_modes text[] not null default '{}'` (additive) — a fourth `TagListEditor` list on the Settings page, in its own "Route" section (distinct from the existing "Currencies & categories" section, since this is route-scoped, not budget-scoped).
- `stops.transport_mode text` (additive, nullable) — plain text, not an FK/enum, matching a value in the trip's configured list. Set via a new strict `<select>` in `StopLogisticsForm` (alongside Guide/Flight), sourced from `trip.transport_modes` — `RouteSpine` already fetches `trip` (since the Milestone A header work), so it threads down through `StopCard` → `StopLogisticsForm` as a prop, same as any other trip-scoped config list. Optional/nullable: an unset stop is not an error state, it's just not colored in yet (graceful-degradation philosophy, same as every other optional field in this app).

**Colored polyline + legend on `MapView.tsx`** — genuinely new, the map currently only plots point markers, no line at all.
- Since modes are open-ended (not a fixed named set), color/pattern can't be a hardcoded lookup table — assign a (color, dash-pattern) pair **positionally**, by each mode's index in `trip.transport_modes`, from a fixed ordered palette built entirely from Broadsheet's existing cyan/magenta ramps (no new colors invented, matching the same constraint the vote-scale mapping in ARCHITECTURE.md §1b already resolved for the identical "not enough accent hues" problem):
  ```
  1. --color-accent-700     solid   5. --color-accent-300    dotted
  2. --color-accent-2-700   solid   6. --color-accent-2-300  dotted
  3. --color-accent-500     dashed  7. --color-accent-900    dashed
  4. --color-accent-2-500   dashed  8. --color-accent-2-900  dotted
  ```
  Known, accepted limitation: a 9th+ configured mode wraps back to slot 1 rather than growing the palette — acceptable for a two-person trip's realistic mode count, same "the slop is acceptable for what this needs to do" standard already applied to Milestone D's timezone slop.
- One `<Polyline>` per consecutive stop pair (sorted by `order_index`), colored by the *arriving* stop's `transport_mode` (ROADMAP's existing rule: "how we arrived colors the segment from the previous one"); the first stop has no incoming segment. A stop with no `transport_mode` set renders its incoming segment as neutral gray (`--color-neutral-400`), solid — never a broken-looking gap.
- Legend: a horizontal wrapped row of small swatch+label chips *below* the map (not a Leaflet canvas overlay — avoids z-index/control-collision complexity), showing only modes actually in use among the trip's stops, not the full configured list.

**Acceptance:** stops can be dragged (real drag gesture, not buttons) into a new order without a constraint violation; a trip can configure its own transport modes (including a custom one like "cycling") from Trip Settings; the map shows a colored, patterned line between stops keyed to each stop's configured mode, with a legend below the map identifying each mode actually in use; a stop with no mode set still renders a visible (neutral) segment, never a gap.

---

### D — Scheduling infrastructure (arrival estimates, packing reminders)

**Goal:** the first time-based (not event-based) notification mechanism this app has needed — every existing trigger fires on insert, not on a clock. Built once, reused by both features below. **Check-in intentionally excluded** — with explicit sign-off to defer it — so "Estimated arrival" ships as a complete, independently-testable unit now rather than waiting on a "Confirmed" contrast state that doesn't exist yet; check-in becomes its own fast-follow once this is live.

- Two-migration split, mechanically required, not just cautious: `ALTER TYPE ... ADD VALUE` can't run in the same transaction that uses the new value, and this repo already wraps migrations in explicit `begin;`/`commit;` blocks. New enum values (`arrival_estimated`, `packing_due`, `trip_joined` — the last one batched in for Milestone B, since the same restriction only needs paying once) land in their own migration first.
- `stops.start_date`, `end_date`, `arrival_time` (nullable, additive) — `date_label` stays as an optional display override, not dropped. `packing_items.due_date` (nullable, additive).
- Real bug fix surfaced along the way: `notify_trip_members`'s exclude-user parameter compared with `!=` against a nullable argument — SQL's three-valued logic makes `x != null` evaluate to unknown/falsy for every row, so a null argument would have silently notified nobody. Fixed to `is distinct from`. Backward-compatible; every existing caller already passes a real value.
- `check_scheduled_arrivals()` / `check_packing_reminders()` — `SECURITY DEFINER`, idempotency-guarded (a notification already existing for that stop/item blocks a duplicate), and arrivals explicitly skip `is_pending` stops (a tentative stop like Kumamoto shouldn't fire an arrival notification).
- Daily GitHub Actions cron, reusing existing repo secrets — no new credential. Calls both functions via `POST`, not the existing heartbeat workflow's `GET` — Supabase/PostgREST requires `POST` for RPC calls to functions that write data; `GET` is reserved for side-effect-free calls specifically so a read can't be triggered into having one.
- Known, accepted limitation, not solved here: comparisons run server-side UTC against plain, timezone-less date columns, so an estimate can be off by close to a day depending on when the daily cron happens to land relative to Japan's UTC+9. There's no timezone column anywhere in the schema yet; the slop is acceptable for what an *estimate* needs to do.
- UI: date/time fields added to `StopLogisticsForm` (the existing "edit details later" dialog, not the lightweight stop-creation form — keeps creating a stop fast, editing details a deliberate separate step) and a due-date field on `PackingForm`. First native date-picker inputs in the app; no library needed for three fields.
- No new status-badge UI yet ("Estimated" vs. "Confirmed") — that contrast needs check-in's "Confirmed" state to mean something, so it waits for that follow-up rather than shipping a badge with only one possible value.

**Acceptance:** seeding a past-dated, non-pending stop and manually invoking `check_scheduled_arrivals()` fires exactly one notification per other member, and a second invocation doesn't duplicate it; a pending stop doesn't fire; the same holds for a past-due packing item against `check_packing_reminders()`.

---

### E — Meal & accommodation indicators

**Goal:** surface which places are meal stops and where the trip is staying — structured, glanceable signals at the place level, replacing (not sitting alongside) the equivalent free-text fields M4 put on stop logistics. Grew beyond the original meals-only scope during build: once meal_tags existed, the same "show the actual place" logic clearly applied to accommodation too — guide/flight stayed stop-level, since neither maps to a specific place the way a restaurant or hotel does.

- `meal_tags` on `places` (array, not nullable single value — breakfast/lunch/dinner; a place can carry more than one, e.g. a hotel restaurant doing both breakfast and dinner)
- `is_accommodation` on `places` (boolean) — where the trip is staying, auto-associated with the right stop via the place's existing `nearest_stop_id`, same as any other place
- Badge/tag (Broadsheet `.tag`) on the place card and place detail page showing meal tags and/or an "Accommodation" tag
- `stops.meals_info` and `stops.hotel_info` both dropped, along with their existing data — explicit product call, not an oversight (ROADMAP history: both fields had real values in use — "All"/"All" for meals on Hiroshima/Tokyo, "Kyoto Ryokan Sakura"/"This one" for hotel on Kyoto/Hiroshima — deliberately not migrated anywhere else)

**Acceptance:** marking a restaurant "dinner" shows a visible tag on both the Route page's place card and the place detail page; a place can carry more than one meal tag; marking a place as accommodation shows an "Accommodation" tag in the same places; the stop edit dialog no longer has Meals or Hotel fields, only Guide and Flight.

---

### F — Fun facts feed

**Goal:** a running feed of destination trivia, sourced from a mix of a free external API and content added directly by either of you — explicitly not AI-generated, to keep this at $0/month.

- New `fun_facts` table: `trip_id`, optional `place_id`/`stop_id`, `source` (`wikipedia` | `manual`), `body`, `added_by` (nullable for API-sourced rows), `created_at`
- Wikipedia REST summary API (`/page/summary/{title}`) called server-side via a new Route Handler — same free, keyless proxy pattern as Nominatim/oEmbed — keyed off each stop's city/place name, fetched once and cached in the table rather than re-fetched per view
- Manual add form mirroring Tips' shape (text + optional place/stop link) for facts either of you write yourselves
- Feed surfaced on the Route page as a small rotating strip (not the whole table at once) — reshuffles which cached facts are shown on every page load, and again automatically every 15 minutes if the page stays open, via TanStack Query's `refetchInterval`. Reshuffling only re-selects from what's already cached in `fun_facts`; it doesn't re-hit the Wikipedia API each time, so the 15-minute cadence costs nothing extra
- Revisit a dedicated tab if the feed grows large enough to crowd the Route page

**Acceptance:** opening the trip shows at least one Wikipedia-sourced fact for a stop with a real city name; leaving the Route page open for 15 minutes rotates in a different fact without a manual refresh; a manually-added fact from either user appears in the same feed, visibly distinguished by source.

---

### G — AI chat assistant

**Goal:** a conversational front-end over trip actions, addressing the form-fatigue feedback directly — builds on M1.5's existing Claude integration rather than opening a second AI surface. Text/caption input only: video and audio transcription is explicitly descoped to hold the $0/month rule, per explicit sign-off — revisit only if real usage shows it's worth paying for.

Scoping below is a first pass, not final — by explicit call, this gets its own dedicated scoping session once E, F, H, and I are underway or done, rather than being locked in now alongside the smaller items.

- Chat UI (new tab — flag if a persistent affordance elsewhere is preferred instead), backed by a Route Handler calling Claude with tool definitions for: add place, add tip, cast/change a vote, log a budget line, and read-only trip summaries ("what's unvoted," "how much have we spent")
- Every tool call goes through the same Supabase client calls / RLS the manual forms already use — the assistant is a new trigger for existing mutations, not a parallel write path
- Same M1.5 safety pattern: `ENABLE_AI_CHAT` toggle (default off), independent Anthropic Console spend cap, graceful "couldn't do that — try the form" fallback on any failure
- Explicit confirmation step in the chat thread before any write-tool call executes — no silent mutations from a misread request

**Acceptance:** asking the assistant to add a place from a pasted description creates a real place after one confirmation step; asking what hasn't been voted on yet returns an accurate read-only summary; killing the feature flag reverts every screen to the existing forms with nothing broken.

---

### H — Share-to-app chooser

**Goal:** extend Milestone B's Web Share Target (currently lands only in Add-a-Place) so a shared link can become either a Place or a Tip — always asking rather than guessing or defaulting, per explicit call.

- Chooser screen inserted between the OS share sheet and the destination form — "Add as Place" / "Add as Tip" — shown every time, no remembered default
- Reuses B's existing pre-fill behavior (source URL only, name left blank) for whichever destination is picked
- Still Android-only, same manifest-level (`share_target`) constraint as B — no new iOS behavior

**Acceptance:** sharing a link from Instagram/TikTok on Android always shows the chooser first; picking either option lands pre-filled in the matching form, matching B's existing pre-fill behavior.

---

### I — Visual place pin confirmation

**Goal:** see and adjust a place's pin on the map before saving it, using the existing free Leaflet/CARTO map — not the Google Maps JS API or Places Autocomplete, both of which stay rejected per ARCHITECTURE.md §1's billing-account/offline-caching conflict.

- Add Place form gains a small embedded map (reusing `MapView`) showing the Nominatim-geocoded pin
- Draggable marker to adjust position before saving; saved lat/lng reflects any manual adjustment, not just Nominatim's raw result
- No new external dependency — same tile layer, same keyless geocode call already in place

**Acceptance:** adding a place shows its geocoded pin on an embedded map before saving; dragging the pin and saving persists the adjusted coordinates, not the original Nominatim result.

---

### Deferred — not scoped yet

**Check-in.** Deferred with explicit sign-off (not an oversight) — ships as a fast-follow once Milestone D is live, adding a `stop_checkins` table (`stop_id, user_id, checked_in_at`, modeled like `votes` — one row per person, not a single per-stop flag) and a tap-to-confirm action that fires a real, non-estimated notification. Entirely foreground, entirely user-initiated — doesn't reopen the §4b location boundary, it's a manual signal, not tracking. This is also the point to add the "Estimated" vs. "Confirmed" status badge that Milestone D deliberately skips.

**Other-person live location.** A different, bigger, consent-sensitive feature from the already-planned foreground-only self-position pin — needs its own explicit opt-in, likely its own table, and a retention/staleness story. Not scoped until there's an answer on whether it's wanted at all.

---

## Beyond M9 (platform vision — not scheduled)

Multi-trip accounts, request-based invites, push notifications, standalone tripless places, voting-visibility model for friend-group scale. These live in PRD §7/§14 as intentionally deferred — pick this roadmap back up with a new M10 when one of them is actually next.
