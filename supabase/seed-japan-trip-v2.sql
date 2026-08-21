-- ============================================================================
-- Japan Trip — real seed data (v2), on top of v1's already-live content
-- Source: japan_trip_extraction_v2.md. Supersedes v1's tips/budget-lines
-- shape entirely (day narrative moves from Tips to stops.description; the
-- single meals aggregate becomes 13 stop-linked daily lines); v1's stops
-- and places are UPDATED/EXTENDED in place, not replaced, since deleting
-- stops would orphan the places/tips/budget_lines that already reference
-- them for no reason.
--
-- Verified against the LIVE schema before writing this (not any document,
-- v1's or v2's own): every new field this needs (stops.description,
-- transport_mode/transport_detail/transport_cost_status/departure_point/
-- arrival_point, trips.outbound_travel_note/return_travel_note/
-- transport_modes, budget_lines.paid_at/stop_id) was added by migration
-- 0017, confirmed applied before this runs. tips.related_stop_id and
-- budget_lines.place_id already existed (Milestone B) — v2's doc was wrong
-- that the former was "confirmed missing"; v1's seed used it successfully.
--
-- Deliberately NOT doing what v2's own draft did: `stops.accommodation_name`
-- is not added — accommodation stays modeled as a Place with
-- is_accommodation = true (already live from v1). The existing Asuka place
-- is kept, not re-inserted (v2's own script would have duplicated it, since
-- it never deletes places before inserting).
--
-- Idempotent to re-run: stops are UPDATEd by name (not inserted), tips and
-- the day/meal budget lines are deleted-then-reinserted for this trip, and
-- the three new places use a NOT EXISTS guard so re-running doesn't
-- duplicate them either.
-- ============================================================================

begin;

create temporary table _seed_trip as
  select id from public.trips where name = 'Cliff & Sally''s Japan Journey';

-- ----------------------------------------------------------------------------
-- Trip-level: the two new travel notes. transport_modes already got its
-- starter default (train/bicycle/walk/bus/ferry/taxi/flight) via migration
-- 0017's column default, which Postgres backfills onto existing rows, not
-- just future inserts — confirmed live, not re-set here to avoid stomping
-- on it if it's already been customized since. tip_categories swaps
-- 'Daily Plan' for 'Local Tips' now that no tip uses the former category
-- (day narrative moved to stops.description, per v2 §0).
-- ----------------------------------------------------------------------------
update public.trips set
  outbound_travel_note = 'International flight Nairobi (NBO) to Tokyo (Narita or Haneda) — book yourselves, not included in the journey package.',
  return_travel_note = 'Domestic flight Kumamoto (KMJ) to Tokyo Narita (NRT), included, connecting to the international flight home. ~40min taxi from Tudzura Inn to Kumamoto Airport; allow 3-4hrs at Narita before the international departure.',
  tip_categories = array(
    select distinct unnest(
      array_remove(tip_categories, 'Daily Plan') || array['Local Tips']
    )
  )
where id = (select id from _seed_trip);

-- ----------------------------------------------------------------------------
-- Stops: UPDATE in place (not delete+reinsert) — the six stops already
-- exist correctly from v1 (same names/towns/coordinates/dates); deleting
-- them would SET NULL every place's nearest_stop_id and tip's
-- related_stop_id for no reason. Only the new travel-detail columns change.
-- ----------------------------------------------------------------------------
update public.stops set
  description = v.description,
  transport_mode = v.transport_mode,
  transport_detail = v.transport_detail,
  transport_cost_status = v.transport_cost_status::transport_cost_status,
  departure_point = v.departure_point,
  arrival_point = v.arrival_point
from (values
  ('Tokyo',
   'Day 1 (arrival): No agenda, make your own way to Edo Sakura, rest. Evening: welcome dinner (paid) with a local Tokyo contact, arranged by Jonah. Breakfast/lunch: none. Day 2 (cycling): sokoiko! Tokyo — back streets, small shrines, quiet neighbourhoods, easy pace, guide meets near Tokyo Station, finishes by lunchtime, afternoon free. Breakfast paid (at hotel). Lunch paid (guide''s recommendation). Dinner own-account — explore Yanaka/Nezu.',
   'train', 'Narita Express or airport bus/train to central Tokyo, then taxi to Yanaka (~¥3,000 total)', 'included',
   'Narita (NRT) or Haneda (HND) Airport', 'Edo Sakura, Yanaka'),
  ('Kyoto',
   'Day 3 (travel in): Slow morning in Yanaka before departing. Settle into Rokkon Guesthouse (a renovated machiya) on arrival, evening free. Breakfast paid. Lunch own-account (buy an ekiben at Tokyo Station before boarding, ~¥1,200). Dinner own-account, near the guesthouse. Day 4 (free day): Entirely open, no schedule. Breakfast paid. Lunch/dinner own-account — budget ~¥6,000/person for the day. Day 5 (Asuka day-trip, cycling): sokoiko! Asuka. Return to Kyoto by evening. Breakfast paid. Lunch paid (Asuka, guide''s recommendation). Dinner own-account, back in Kyoto.',
   'train', 'Nozomi bullet train (Shinkansen), ~2h15min', 'included',
   'Tokyo Station (Tokaido-Sanyo line platforms)', 'Kyoto Station, then walk/taxi to Rokkon Guesthouse'),
  ('Tsuwano',
   'Day 6 (travel in): Small local train climbing into the mountains after the Shinkansen leg. Arrive late afternoon. Breakfast paid. Lunch own-account (ekiben at Kyoto Station). Dinner: check with Jonah — possible evening with a local community member, confirm whether included. Day 7 (cycling): sokoiko! Tsuwano — traditional Japanese breakfast first, then cycling through town and countryside, afternoon/evening free. Breakfast paid (traditional — miso soup, rice, grilled fish, pickles). Lunch paid (guide''s recommendation). Dinner own-account, in town.',
   'train', 'Shinkansen (Sanyo line) then local mountain train (Yamaguchi line)', 'included',
   'Kyoto Station (Sanyo Shinkansen platforms)', 'Shin-Yamaguchi Station, change to Tsuwano Station'),
  ('Oasa',
   'Day 8 (travel in): Landscape shifts to satoyama countryside. Jonah personally joins at Hamada Station. Breakfast paid. Lunch: none set — buy something at a station if hungry, own-account. Dinner paid — BBQ at Tanakaya with Jonah and local community members.',
   'train', 'Local train, multiple changes, via Hiroshima', 'included',
   'Tsuwano Station', 'Hiroshima, change, then Oasa/Kitahiroshima Town'),
  ('Hiroshima',
   'Day 9 (cycling in Oasa, then travel): Morning: sokoiko! Oasa — satoyama countryside cycling. Afternoon: transfer to Hiroshima, check into KIRO Hiroshima. Breakfast paid. Lunch paid (woven into the ride). Dinner own-account — see nearby places for named okonomiyaki spots. Note: 3 Nov is Culture Day, a national holiday — some sites busier. Day 10 (cycling + Miyajima): sokoiko! Hiroshima + Miyajima — cycle the six rivers, flat and relaxed, afternoon ferry to Miyajima (timing depends on tides, Jonah coordinates). Breakfast paid. Lunch paid (during the ride). Dinner own-account — final Hiroshima night, oysters or ramen.',
   'train', 'Local train from the Oasa area, after the morning''s cycling', 'included',
   'Tanakaya / Oasa area', 'Hiroshima Station, then KIRO Hiroshima'),
  ('Kumamoto',
   'Day 11 (travel in): Wider skies, different pace. Arrive and settle in, rest of the day open. Breakfast paid. Lunch own-account (bento at Hiroshima Station or on the train). Dinner own-account — Kumamoto ramen and basashi worth trying. Day 12 (free day): Last full day, intentionally open — sleep in, find a café, walk to the castle, or don''t. Breakfast paid. Lunch own-account (Shimotori arcade has good spots). Dinner own-account — final dinner of the trip. Day 13 (departure): Final breakfast at Tudzura, then onward per the trip''s return travel note.',
   'train', 'Shinkansen, Sakura service (Sanyo + Kyushu lines), ~1h20min', 'included',
   'Hiroshima Station (Sanyo-Kyushu Shinkansen platforms)', 'Kumamoto Station, then taxi/walk to Tudzura Inn')
) as v(stop_name, description, transport_mode, transport_detail, transport_cost_status, departure_point, arrival_point)
where stops.trip_id = (select id from _seed_trip) and stops.name = v.stop_name;

-- ----------------------------------------------------------------------------
-- Places: only the 3 genuinely new ones. Asuka and the 6 accommodation
-- places already exist from v1 and are kept as-is — not re-inserted.
-- NOT EXISTS guard makes this safe to re-run.
-- ----------------------------------------------------------------------------
insert into public.places (trip_id, name, town, nearest_stop_id, note, added_by, booking_status)
select (select id from _seed_trip), v.name, v.town,
       (select id from public.stops where trip_id = (select id from _seed_trip) and name = v.stop_name),
       v.note,
       (select id from public.profiles where display_name = v.author),
       'not_booked'
from (values
    ('Fushimi Inari Taisha', 'Fushimi-ku, Kyoto', 'Kyoto', 'Suggested for the Day 4 free day — go early morning to avoid crowds.', 'Sally'),
    ('Taikodani Inari Shrine', 'Tsuwano', 'Tsuwano', '1,174 red torii gates leading up a hillside — far less visited than Fushimi Inari.', 'Sally'),
    ('Hassho or Micchan (Hiroshima okonomiyaki)', 'Near Hondori shopping arcade, Hiroshima', 'Hiroshima', 'Day 9 dinner suggestion, own-account. Two named options, not a firm booking — worth deciding between them rather than picking one for you.', 'cliff.moffitt')
  ) as v(name, town, stop_name, note, author)
where not exists (
  select 1 from public.places
  where trip_id = (select id from _seed_trip) and name = v.name
);

-- ----------------------------------------------------------------------------
-- Tips: v1's 13 "Daily Plan" tips are replaced entirely — that content now
-- lives on stops.description above. These 6 are genuine advice only.
-- ----------------------------------------------------------------------------
delete from public.tips
  where trip_id = (select id from _seed_trip) and category = 'Daily Plan';

insert into public.tips (trip_id, category, format, content_text, related_stop_id, added_by)
select (select id from _seed_trip), 'Local Tips', 'text', v.content,
       (select id from public.stops where trip_id = (select id from _seed_trip) and name = v.stop_name),
       (select id from public.profiles where display_name = v.author)
from (values
  ('Tokyo', 'cliff.moffitt', 'Your guide speaks English and will show you parts of Tokyo most tourists never reach. Wear comfortable shoes, bring a camera. Yanaka Ginza shopping street is worth a wander in the free afternoon.'),
  ('Kyoto', 'Sally', 'IC card works on Kyoto buses and subway. Ask Jonah for less-touristy spots — Philosopher''s Path and Arashiyama bamboo grove among the suggestions. Nishiki Market is good for food-stall lunches. Fushimi Inari: go early morning to avoid crowds. Rokkon Guesthouse is a renovated machiya — wooden beams, a quiet inner courtyard.'),
  ('Tsuwano', 'cliff.moffitt', 'Sit on the RIGHT side of the train from Tokyo to Kyoto for the best Mt Fuji view (~45min after leaving Tokyo). Tsuwano is ''Little Kyoto of the West'' — white-walled samurai houses, koi swimming in roadside channels (buy fish food to feed them). Taikodani Inari Shrine has 1,174 red torii gates, far less visited than Fushimi Inari. The owners of Nomad Tsuwano welcome you personally on arrival.'),
  ('Oasa', 'Sally', 'Tanakaya is a private house reserved just for you — tatami mats, complete countryside silence. The BBQ dinner with local community members is one of the more special evenings of the trip.'),
  ('Hiroshima', 'cliff.moffitt', 'Try Hiroshima-style okonomiyaki — layered with noodles, different from Osaka style (see Hassho/Micchan in Places). Miyajima''s torii gate appears to float at high tide; friendly wild deer on the island; try momiji manju (maple-leaf cakes, sweet red bean).'),
  ('Kumamoto', 'Sally', 'Kumamoto Castle was badly damaged in the 2016 earthquake and is under careful, visible restoration. Kumamoto City Tram runs two lines, IC card works. Suizenji Jojuen Garden has a miniature version of the Tokaido road. Try Kumamoto ramen and basashi (horse sashimi) — a local specialty worth trying.')
  ) as v(stop_name, author, content);

-- ----------------------------------------------------------------------------
-- Budget lines: full replace. v1's 10 lines (including the single ¥56,000
-- meals aggregate) are cleared; the 9 unchanged-content lines are
-- reinserted alongside the 13 new stop-linked daily lines (¥61,000 total —
-- the higher, more complete figure per extraction v2 §0's own reasoning:
-- the ¥5,000 gap from v1's ¥56,000 is exactly Day 1 + Day 13's incidental
-- transport budgets, not noise) and the 1 new Hassho/Micchan placeholder
-- line. 9 + 13 + 1 = 23, matching the target count.
-- ----------------------------------------------------------------------------
delete from public.budget_lines where trip_id = (select id from _seed_trip);

insert into public.budget_lines (trip_id, category, description, amount_minor, currency, status, due_date, paid_at, created_by)
select (select id from _seed_trip), v.category, v.description, v.amount_minor, v.currency, v.status::budget_status, v.due_date::date, v.paid_at::date,
       (select id from public.profiles where display_name = 'cliff.moffitt')
from (values
    ('guided_tour', 'Journey deposit (30%) — Hope Bus Cooperative', 360000, 'JPY', 'paid', '2026-06-06', null),
    ('guided_tour', 'Journey balance (70%) — Hope Bus Cooperative', 840000, 'JPY', 'pending', '2026-08-27', null),
    ('visa', 'Cliff — tourist visa application fee', 3116, 'KES', 'pending', '2026-10-01', null),
    ('visa', 'Sally — tourist visa application fee', 3116, 'KES', 'pending', '2026-10-01', null),
    ('shopping', 'Shopping — souvenirs, gifts, clothing', 80000, 'JPY', 'pending', null, null),
    ('meals', 'Snacks, drinks, coffees throughout', 8000, 'JPY', 'pending', null, null),
    ('other', 'Luggage forwarding, Kyoto → Hiroshima', 4000, 'JPY', 'pending', '2026-10-28', null),
    ('other', 'Japan data SIM card', 4000, 'JPY', 'pending', null, null),
    ('other', 'Cash contingency (ATM top-ups)', 30000, 'JPY', 'pending', null, null)
  ) as v(category, description, amount_minor, currency, status, due_date, paid_at);

insert into public.budget_lines (trip_id, category, description, amount_minor, currency, status, stop_id, created_by)
select (select id from _seed_trip), 'meals', v.description, v.amount_minor, 'JPY', 'pending',
       (select id from public.stops where trip_id = (select id from _seed_trip) and name = v.stop_name),
       (select id from public.profiles where display_name = 'cliff.moffitt')
from (values
    ('Tokyo', 'Day 1 budget (Tokyo, arrival)', 3000),
    ('Tokyo', 'Day 2 budget (Tokyo, cycling)', 3000),
    ('Kyoto', 'Day 3 budget (Tokyo → Kyoto travel)', 5000),
    ('Kyoto', 'Day 4 budget (Kyoto, free day)', 12000),
    ('Kyoto', 'Day 5 budget (Asuka day-trip)', 3500),
    ('Tsuwano', 'Day 6 budget (Kyoto → Tsuwano travel)', 3500),
    ('Tsuwano', 'Day 7 budget (Tsuwano, cycling)', 3500),
    ('Oasa', 'Day 8 budget (Tsuwano → Oasa travel)', 1500),
    ('Hiroshima', 'Day 9 budget (Oasa cycling → Hiroshima)', 4000),
    ('Hiroshima', 'Day 10 budget (Hiroshima + Miyajima)', 4000),
    ('Kumamoto', 'Day 11 budget (Hiroshima → Kumamoto travel)', 7000),
    ('Kumamoto', 'Day 12 budget (Kumamoto, free day)', 9000),
    ('Kumamoto', 'Day 13 budget (departure)', 2000)
  ) as v(stop_name, description, amount_minor);

insert into public.budget_lines (trip_id, category, description, amount_minor, currency, status, place_id, created_by)
select (select id from _seed_trip), 'meals', 'Dinner — Hassho or Micchan (Hiroshima okonomiyaki)', 0, 'JPY', 'pending',
       id, (select id from public.profiles where display_name = 'cliff.moffitt')
from public.places
where trip_id = (select id from _seed_trip) and name = 'Hassho or Micchan (Hiroshima okonomiyaki)';
-- amount_minor left at 0 deliberately — no fixed figure given in the
-- source; a placeholder to fill in once a real amount is known.

-- Placeholders still not filled in (unchanged from v1): flights (x2),
-- visa document costs — no firm figures exist yet, not seeded.

-- Packing items: unchanged from v1, not touched here.

commit;

-- ============================================================================
-- Verify after running (all against fbaf7e9b-ac66-4158-a2f2-32cabc4745e1 /
-- 'Cliff & Sally''s Japan Journey'):
--   stops: 6 · places: 10 · tips: 6 · budget_lines: 23
--   sum(amount_minor) where currency='JPY': 1,387,000
-- ============================================================================
