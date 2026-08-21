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

### C — Route cluster (date-based ordering, transport-mode line) — shipped (2026-08-21)

**Goal:** narrower than originally scoped twice now. First pass: real dates ship as part of Milestone D, so this picks up once D is live and stop dates already exist. Second pass (2026-08-21, confirmed explicitly, not defaulted): **date-based ordering replaces drag-reorder entirely, not just adds to it.** No drag interaction gets built — editing a stop's date *is* how its position changes, reusing the date-picker Stop Detail's Overview tab already has (ROADMAP's "eight items" bundle, 2026-08-21). What's left after that pivot: the Route page sorting by date, and the map's colored transport line.

**Reordering — date-based, not drag — shipped (2026-08-21).** The Route page sorts stops by `start_date` (`sortStopsByDate`); `order_index` is only a fallback ordering for a newly-added stop with no date yet (ties/nulls sort after everything dated, in `order_index` order among themselves). No `@dnd-kit` dependency, no grab handle, no `reorder_stops()` RPC — all superseded by this pivot, not built alongside it. Moving a stop earlier or later in the route is just changing its date on Stop Detail. Caught and fixed the exact bug this was meant to solve on its first real use: a stop added after the others but dated earlier (Kumamoto trip's real "Abu Dhabi" stop) was sitting at the bottom of the list until this shipped.

**Transport mode — shipped already (2026-08-21), not still to build.** `trips.transport_modes` (per-trip configurable array, `TagListEditor` in Trip Settings, seeded with a starter default rather than empty) and `stops.transport_mode`/`transport_detail`/`transport_cost_status`/`departure_point`/`arrival_point` all landed via migration 0017 and are wired into `StopLogisticsForm`/Stop Detail's Overview tab as part of the Japan-trip seed and the "eight items" bundle. What's below (the map line) is the only piece of C still actually unbuilt.

**Colored polyline + legend on `MapView.tsx` — shipped (2026-08-21).** Modes are open-ended (not a fixed named set), so color/pattern isn't a hardcoded lookup table — `transport-mode-line-style.ts` assigns a (color, dash-pattern) pair **positionally**, by each mode's index in `trip.transport_modes`, from a fixed 8-slot palette built entirely from Broadsheet's existing cyan/magenta ramps (no new colors invented, matching the same constraint the vote-scale mapping in ARCHITECTURE.md §1b already resolved for the identical "not enough accent hues" problem):
  ```
  1. --color-accent-700     solid   5. --color-accent-300    dotted
  2. --color-accent-2-700   solid   6. --color-accent-2-300  dotted
  3. --color-accent-500     dashed  7. --color-accent-900    dashed
  4. --color-accent-2-500   dashed  8. --color-accent-2-900  dotted
  ```
  Known, accepted limitation: a 9th+ configured mode wraps back to slot 1 rather than growing the palette — acceptable for a two-person trip's realistic mode count, same "the slop is acceptable for what this needs to do" standard already applied to Milestone D's timezone slop.
- One `<Polyline>` per consecutive stop pair (`sortStopsByDate` — same ordering rule the Route page itself uses), colored by the *arriving* stop's `transport_mode` ("how we arrived colors the segment from the previous one"); the first stop has no incoming segment. A stop with no `transport_mode` set renders its incoming segment as neutral gray (`--color-neutral-400`), solid — never a broken-looking gap.
- Legend: a horizontal wrapped row of small swatch+label chips below the map (not a Leaflet canvas overlay — avoids z-index/control-collision complexity), showing only modes actually in use among the trip's stops, plus a neutral "Not set" entry only if at least one segment has no mode.
- Surfaced and fixed a layout bug while verifying this live: the map's height was previously budgeted off a fixed `100dvh` calc that didn't account for `BottomNav`'s real (content-driven, not fixed) height, so the legend rendered fully behind the fixed nav — invisible despite being in the DOM. Fixed by sizing the map to a fixed `70dvh` instead of "fill exactly what's left," letting the page scroll for the legend rather than pixel-budgeting against a height that drifts with content; also bumped `TripLayout`'s `pb-16` to `pb-20` to match `BottomNav`'s actual rendered height (was silently 14px short before this).

**Acceptance:** the Route page sorts stops by date, with an undated new stop falling back to insertion order; the map shows a colored, patterned line between stops keyed to each stop's configured transport mode, with a legend below the map identifying each mode actually in use; a stop with no mode set still renders a visible (neutral) segment, never a gap.

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

### E — Meal & accommodation indicators — shipped

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

### H — Share-to-app chooser — shipped (2026-08-21)

**Goal:** extend Milestone B's Web Share Target (currently lands only in Add-a-Place) so a shared link can become either a Place or a Tip — always asking rather than guessing or defaulting, per explicit call.

- `share-target/route.ts` now redirects to a new `/trips/[tripId]/share-choose` page instead of straight to Add-a-Place — a small `ShareChooser` client component with two buttons, "Add as Place" / "Add as Tip", shown every time, nothing remembered
- Reuses B's existing pre-fill behavior for the Place destination unchanged (source URL only, name left blank); `TipForm` gained the same `initialSourceUrl` pattern for the Tip destination, defaulting the format toggle to "Video" (the only format where a link field applies) and auto-opening the Tips page's add-tip dialog rather than requiring an extra tap
- Still Android-only, same manifest-level (`share_target`) constraint as B — no new iOS behavior
- Verified end-to-end in a real browser (disposable account + throwaway trip, not the real "Japan 2026" trip) rather than just typecheck/lint: chooser renders both options, each one navigates and pre-fills correctly, zero console errors

**Acceptance:** sharing a link from Instagram/TikTok on Android always shows the chooser first; picking either option lands pre-filled in the matching form, matching B's existing pre-fill behavior.

---

### I — Visual place pin confirmation

**Goal:** see and adjust a place's pin on the map before saving it, using the existing free Leaflet/CARTO map — not the Google Maps JS API or Places Autocomplete, both of which stay rejected per ARCHITECTURE.md §1's billing-account/offline-caching conflict.

- Add Place form gains a small embedded map (reusing `MapView`) showing the Nominatim-geocoded pin
- Draggable marker to adjust position before saving; saved lat/lng reflects any manual adjustment, not just Nominatim's raw result
- No new external dependency — same tile layer, same keyless geocode call already in place

**Acceptance:** adding a place shows its geocoded pin on an embedded map before saving; dragging the pin and saving persists the adjusted coordinates, not the original Nominatim result.

---

### J — Detail pages and pattern completeness, round two — shipped (2026-08-21)

**Goal:** eight items folded in together — four surfaced by a self-audit against earlier work (a field or FK existed without the feature actually built around it, same shape as Milestone B's original "pattern completeness"), four new from actual usage of the real Japan trip data. Same discipline as every round before this: verified live against the database before writing anything, not assumed from a prior roadmap entry.

**Shared foundation — `DetailTabs`.** A single Overview/Tips/Costs tabbed pattern (`src/components/ui/DetailTabs.tsx`), built once and applied twice, not two bespoke layouts. Reuses Broadsheet's existing `.seg` segmented control rather than a new tab-bar component. Each tab optionally supplies its own `onAdd`/`addLabel` — Overview gets none (editing stays the existing pencil-icon → edit-mode pattern, "add" doesn't mean anything for an overview), Tips/Costs each get one.
- **New Stop Detail page** (`/trips/[tripId]/stops/[stopId]`) — didn't exist before; the Route page's `StopCard` is now a shortcut into it (name links there, the caret still expands the inline place list separately), same relationship `PlaceRow` has to `PlaceDetail`. Overview: dates, transport fields (mode/detail/departure/arrival/cost-status, all from migration 0017), linked accommodation places (`is_accommodation`, not a `stops.accommodation_name` field — deliberately rejected twice now in favor of the existing place-tag model), guide/flight info, and `description` rendered with visual breaks between days (`splitDayNarrative`, pure display-time splitting on the `Day N —` pattern, no schema change — the day-level-table alternative stays deferred, as originally designed). Tips/Costs tabs are real, with edit/delete, not read-only.
- **`PlaceDetail` retrofitted** onto the same `DetailTabs` pattern instead of its previous single-view layout. Its Costs tab gained real edit/delete via `CostLineRow` (previously just a plain-text list with no interaction at all). Its Tips tab is new — `tips.related_place_id` existed since Milestone B but was never surfaced on the place side, only shown as "Near {place}" on the trip-wide Tips list.

**Tips-to-places, executed.** Every seeded "Local Tips" tip audited against what's actually a place-specific mention vs. genuinely stop-wide advice. Since the six original tips were paragraph blobs mixing both, this meant splitting, not relabeling: 6 new place-linked tips extracted (Fushimi Inari Taisha, Rokkon Guesthouse, Taikodani Inari Shrine, Nomad Tsuwano, Tanakaya, Hassho or Micchan), leaving 6 trimmed stop-wide tips behind (Tokyo and Kumamoto untouched — neither has a seeded place to extract to).

**Mark-as-paid, as a real action.** `paid_at` existed since migration 0017 but had zero UI. `CostLineRow`'s tap-to-cycle no longer reaches "paid" directly — it's `not_booked ↔ pending` only now; reaching "paid" is the dedicated Mark-as-paid button (`useMarkBudgetLinePaid`), which sets both `status` and `paid_at` together. Tapping an already-paid tag steps back to `not_booked` (an undo) and clears `paid_at`, same mutation, so a stale date never survives a status change regardless of which path caused it. `paid_at` stays editable afterward (`useUpdateBudgetLinePaidAt`) for a backdated entry. `BudgetSummary` now shows "¥X paid of ¥Y logged" per currency instead of one blended figure; the cap comparison still runs against the logged total, since a cap is about total commitment, not just what's been settled.

**Delete a stop.** `useDeleteStop`, confirmed safe by construction before it was written — `places.nearest_stop_id`, `tips.related_stop_id`, and `budget_lines.stop_id` are all `ON DELETE SET NULL`, verified live, not assumed. The confirm dialog states the linked counts explicitly ("this stop has N places and M costs linked — they'll stay, just unassigned from any stop"), not a bare "delete this stop?".

**Date validation, in two places.** Client-side immediate feedback (a pre-submit check in `StopLogisticsForm`, `AddStopForm`, and `TripDetailsForm`, plus a matching Zod `.refine()` in each schema as defense-in-depth) *and* a real `check (end_date >= start_date)` constraint on both `stops` and `trips` (migration 0019) — a form-only check stops being true the moment anything touches the data directly. The constraint caught a real problem before it ever reached the migration file: a stop named "Abu Dhabi Emirate" on the live trip had its dates reversed (not seeded — added later, separately) and had to be deleted (confirmed with explicit sign-off) before the migration could apply.

**Milestone C's scope, pivoted.** Date-based ordering replaces drag-reorder entirely — see C's own entry above for the rewrite. Not additive; the drag/`dnd-kit`/`reorder_stops()` plan is superseded, not still planned alongside this.

**Acceptance:** Stop Detail and Place Detail both show Overview/Tips/Costs via the same tab component; a stop's day-by-day description renders as separate paragraphs, not one block; every place-linked tip shows up on its place's Tips tab; marking a cost paid records today's date and shows on `BudgetSummary` as a distinct paid figure; deleting a stop leaves its linked places/tips/costs intact but unassigned, with the confirm dialog stating exactly what's linked; saving a stop or trip with an inverted date range is rejected both in the form and at the database.

**Fast-follow, same day (2026-08-21):** Stop Detail gained a fourth tab, **Places** — every place with that stop as its `nearest_stop_id`, listed and hyperlinked into `PlaceDetail` (a lighter list than `PlaceRow`'s full voting UI, since that wasn't what was asked for — just the list + link). Transport mode now shows a Phosphor icon next to its tag (`transport-mode-icon.tsx`, a lookup keyed on the trip's own configured modes with a `Compass` fallback for anything custom) — small, but "how do we get around" reads faster as an icon than a bare tag. Also added: an Android-only install-prompt banner (`InstallPrompt.tsx`, `beforeinstallprompt`) on every `(app)` page for anyone using the browser tab instead of the installed PWA — shows once per browser-tab visit, a dismiss goes quiet for 24h rather than reappearing every load; no iOS path yet (no equivalent browser API there, same platform split as Web Share Target).

**Second fast-follow (2026-08-21):** Every start/end date pair (trip, stop, add-stop) now disables the invalid side of the range via the sibling field's live value (`min`/`max` on the native date input), not just server/Zod rejection after the fact. `MealTagPicker` swapped Broadsheet's hidden-checkbox `.seg-opt` styling for a visible checkbox plus a Phosphor icon per meal (`Coffee`/`ForkKnife`/`MoonStars`) — meal tags aren't mutually exclusive the way `.seg` implies, so a real checkbox plus icon reads selection state more clearly than a background-color highlight alone. `RouteSpine`'s "Hide places I've skipped" now defaults unchecked — a skip shouldn't silently vanish a place from the default view. `TripDetailsForm`, `TripBudgetSettings`, and `ProfileForm` all gained the read-only/edit-mode-toggle pattern already established on `StopDetail`/`PlaceDetail` (pencil icon → edit → save returns to a read-only view), closing the one remaining gap where a saved form stayed sitting open as editable fields. Also: `vercel.json` now pins deployment to `cdg1` (Paris) to match Supabase's `eu-west-3` region, addressing the top-nav-icon latency report.

---

### K — Push notifications — shipped (2026-08-21)

**Goal:** real OS-tray notifications while the app isn't open — M7's existing `notifications` system (instant/digest paths, `NotificationBell`) is entirely in-app and has no path to a closed app at all. Scoped earlier the same day, built same-day per explicit go-ahead.

- **Per-type, per-person config, not a fixed "these types push" rule** — the one thing the initial scoping pass explicitly flagged as unresolved. `profiles.push_enabled_types` (`notification_type[]`, migration 0020) lets each person choose which of the six real types (`consensus_reached`, `place_added`, `tip_added`, `arrival_estimated`, `packing_due`, `trip_joined` — `vote_cast` stays excluded, nothing fires it) trigger a push, edited via a checklist on the Profile page. Defaults to the four types already marked `is_instant=true` on `notifications` (consensus/arrival/packing/joined); routine place/tip adds default off but are fully toggleable — `is_instant` seeded the default, it doesn't gate push at send time.
- `push_subscriptions` table (`user_id`, `endpoint`, `p256dh`, `auth`) — one row per device/browser, since a person can have more than one subscribed at once. Enabling is per-device (the Profile page toggle reflects *this browser's* subscription state, not an account-wide flag).
- VAPID keypair generated via `web-push`'s `generateVAPIDKeys()`. Correction from the original scoping note: the private key is a **Supabase Edge Function secret**, not a Vercel secret — the sender is the Edge Function (Deno), not a Next.js route, so Vercel never touches it. Public key ships as `NEXT_PUBLIC_VAPID_PUBLIC_KEY`.
- `sw.ts` gained `push` (calls `self.registration.showNotification`) and `notificationclick` (focuses an already-open tab and navigates it to the notification's target route, opening a new one only if none exists) handlers.
- Send path, preserving the same "fires the instant the row lands" guarantee the in-app consensus notification already has (a polling cron would quietly break that): `notify_push()`, an `AFTER INSERT` trigger on `notifications` (migration 0021), checks the recipient's `push_enabled_types`, then fires `pg_net.http_post` (fire-and-forget, doesn't block the insert) to `supabase/functions/send-push` — a Deno Edge Function (deployed `--use-api`, no Docker available in this environment) that looks up the recipient's subscriptions, builds a title/body/url per type, and sends via `npm:web-push`, deleting any subscription the push service reports as expired (404/410).
- Auth between the trigger and the function is a random shared secret (`INTERNAL_PUSH_SECRET`, `openssl rand -hex 32`), stored in Supabase Vault and read by the trigger at call time — not the project's real service-role key, and not hardcoded in the migration file that ships to git. The function is deployed `--no-verify-jwt` since pg_net's call carries no user session; the shared-secret header is the actual gate, checked before anything else runs.
- **Platform note, genuinely different from Web Share Target/the install banner**: iOS 16.4+ Safari *does* support standard Web Push for a PWA already added to the home screen (no paid Apple Developer account needed) — but only once installed, not from a regular Safari tab. Not excluded from iOS the way Share Target is.
- **Testing limitation, disclosed rather than papered over**: real end-to-end delivery (an actual OS toast appearing) isn't verifiable in this sandboxed headless environment. Confirmed instead: the migration/schema/RLS applied correctly against the live DB; the Edge Function is deployed, reachable, and correctly rejects a wrong `x-internal-secret` (401) while no-opping cleanly for a recipient with zero subscriptions; the `notify_push()` trigger fires and calls the function the instant a notification row is inserted (`net._http_response` showed a `200 {"sent":0}` immediately after a manual insert); new profiles get the correct default `push_enabled_types`; the Profile page's checklist and its save-on-toggle behavior are covered by a component test (mocked hooks, not a real subscription). Actually subscribing via `pushManager.subscribe()` reliably failed in Playwright here — first with Chrome's real, undetectable "Push API is disabled in incognito" restriction (Playwright's default context is effectively incognito), and after switching to a persistent profile, with "push service not available," which reads as this sandbox's headless Chromium not completing Chrome's real push-registration handshake rather than anything about the app's own code. Real-device verification (an actual phone or a non-sandboxed browser) is the way to close this gap.

**Acceptance:** a person can enable notifications on a device and pick which types push; inserting a `notifications` row for an enabled type reaches the Edge Function within moments of the insert, not on a delayed cron; disabling a type or disabling push entirely stops future sends without touching in-app notifications, which are unaffected either way.

---

### Deferred — not scoped yet

**Check-in.** Deferred with explicit sign-off (not an oversight) — ships as a fast-follow once Milestone D is live, adding a `stop_checkins` table (`stop_id, user_id, checked_in_at`, modeled like `votes` — one row per person, not a single per-stop flag) and a tap-to-confirm action that fires a real, non-estimated notification. Entirely foreground, entirely user-initiated — doesn't reopen the §4b location boundary, it's a manual signal, not tracking. This is also the point to add the "Estimated" vs. "Confirmed" status badge that Milestone D deliberately skips.

**Other-person live location.** A different, bigger, consent-sensitive feature from the already-planned foreground-only self-position pin — needs its own explicit opt-in, likely its own table, and a retention/staleness story. Not scoped until there's an answer on whether it's wanted at all.

**Per-person packing completion, matrix-style — shipped (2026-08-21).** Surfaced seeding the real Japan trip data: the duplicate-row workaround (one `packing_items` row per person for anything needing independent tracking) turned out to be genuinely confusing in practice — the old Documents section never split by owner, so a per-person item showed up twice with identical text and no visible label. Replaced with a `packing_item_checks` table (`item_id, user_id, checked_at`) — one row per person, modeled exactly like `votes`, not an ownership flag on a duplicated row — plus `packing_items.is_shared` deciding whether an item renders as one checkbox (shared) or one column per current trip member (`PackingMatrix`, horizontal-scroll grid with a sticky item column, auto-extends as new members join). `owner_id` is dropped entirely, including its one other dependency (`check_packing_reminders()`, rewritten to notify per-member for non-shared items rather than a single fixed owner). The 30 duplicate visa-checklist rows were consolidated back down to 15.

---

## Beyond M9 (platform vision — not scheduled)

Multi-trip accounts, request-based invites, standalone tripless places, voting-visibility model for friend-group scale. These live in PRD §7/§14 as intentionally deferred — pick this roadmap back up with a new M10 when one of them is actually next.
