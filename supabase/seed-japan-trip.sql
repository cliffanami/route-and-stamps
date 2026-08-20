-- ============================================================================
-- Japan Trip — real seed data, replacing accumulated test/QA debris
-- Source: Japan_Journey_Cliff_Sally_FINAL.xlsx, read in full (4 tabs).
-- One-off script (not a migration) — matches seed-m0.sql/seed-stops-m0.sql's
-- convention of looking the trip/users up by name/email, not hardcoded
-- UUIDs — resolved ONCE into a temp table below rather than re-queried by
-- name in every block, since the trip gets renamed partway through this
-- script (an earlier version of this file had exactly that bug: later
-- blocks re-looked-up 'Japan 2026' after the UPDATE had already renamed it
-- to 'Cliff & Sally''s Japan Journey' in the same transaction, silently
-- matching zero rows).
--
-- Verified against the LIVE schema before writing this (not a drifted local
-- copy): tips.related_stop_id, stops.start_date/end_date, and
-- packing_items.due_date all already exist. stops.accommodation_name does
-- NOT exist and isn't added here — accommodation is modeled as a Place with
-- is_accommodation = true (shipped this session), not stop-level text.
--
-- The live "Japan 2026" trip had accumulated ~23 places, 6 tips, 8 budget
-- lines, 6 packing items, and 41 trip_members from automated E2E/diagnostic
-- test runs across development — not a clean placeholder. This script wipes
-- that before seeding, keeping only the two real members. Idempotent to
-- re-run: cleanup deletes are no-ops on an already-clean trip, the trip
-- UPDATE re-applies the same values, and the category-array append dedupes.
-- ============================================================================

begin;

create temporary table _seed_trip as
  select id from public.trips where name in ('Japan 2026', 'Cliff & Sally''s Japan Journey');

-- ----------------------------------------------------------------------------
-- Clean out test/QA debris — scoped tightly to this one trip. Votes cascade
-- automatically when their place is deleted (votes.place_id ON DELETE
-- CASCADE); tips/budget_lines' place references SET NULL harmlessly since
-- every tip/budget_line is being deleted too, in the same transaction.
-- ----------------------------------------------------------------------------
delete from public.places where trip_id = (select id from _seed_trip);
delete from public.tips where trip_id = (select id from _seed_trip);
delete from public.budget_lines where trip_id = (select id from _seed_trip);
delete from public.packing_items where trip_id = (select id from _seed_trip);
delete from public.stops where trip_id = (select id from _seed_trip);

delete from public.trip_members
  where trip_id = (select id from _seed_trip)
    and user_id not in (
      select id from public.profiles where display_name in ('cliff.moffitt', 'Sally')
    );

-- ----------------------------------------------------------------------------
-- Trip-level fields. budget_mode 'tally', not 'cap': the sheet documents
-- real committed/estimated totals, not a ceiling to enforce. Also extends
-- the strict category/currency dropdowns (Milestone A follow-up) with the
-- two new values this data needs — appended, not replaced, so nothing
-- already configured is lost.
-- ----------------------------------------------------------------------------
update public.trips set
  name = 'Cliff & Sally''s Japan Journey',
  start_date = '2026-10-26',
  end_date = '2026-11-07',
  is_international = true,
  budget_mode = 'tally',
  budget_cap = null,
  budget_cap_currency = 'JPY',
  budget_categories = array(select distinct unnest(budget_categories || array['shopping'])),
  tip_categories = array(select distinct unnest(tip_categories || array['Daily Plan']))
where id = (select id from _seed_trip);

-- ----------------------------------------------------------------------------
-- Stops (6) — Asuka is a day-trip from Kyoto, not an overnight stay, so it's
-- seeded as a Place below, not a 7th stop. Coordinates are city/station-
-- level centroids, not GPS-precise — good enough for the route spine.
-- ----------------------------------------------------------------------------
insert into public.stops (trip_id, name, town, lat, lng, order_index, date_label, is_pending, start_date, end_date)
select (select id from _seed_trip), v.name, v.town, v.lat, v.lng, v.order_index, v.date_label, false, v.start_date::date, v.end_date::date
from (values
    ('Tokyo', 'Yanaka, Tokyo', 35.6762, 139.6503, 1, 'Japan''s electric capital · Days 1–2', '2026-10-26', '2026-10-28'),
    ('Kyoto', 'Kyoto old quarter', 35.0116, 135.7681, 2, 'Ancient capital & temples · Days 3–5', '2026-10-28', '2026-10-31'),
    ('Tsuwano', 'Tsuwano, Shimane', 34.4551, 131.7644, 3, 'Little Kyoto of the Mountains · Days 6–7', '2026-10-31', '2026-11-02'),
    ('Oasa', 'Kitahiroshima Town', 34.6167, 132.5333, 4, 'Deep countryside & satoyama life · Day 8', '2026-11-02', '2026-11-03'),
    ('Hiroshima', 'Central Hiroshima', 34.3853, 132.4553, 5, 'Rivers, history & Miyajima · Days 9–10', '2026-11-03', '2026-11-05'),
    ('Kumamoto', 'Kumamoto, Kyushu', 32.8032, 130.7079, 6, 'Kyushu island, final stretch · Days 11–12', '2026-11-05', '2026-11-07')
  ) as v(name, town, lat, lng, order_index, date_label, start_date, end_date);

-- ----------------------------------------------------------------------------
-- Places (7): Asuka (the one genuine votable point-of-interest in the
-- sheet — everything else is itinerary narrative, captured in the daily
-- Tips below) + one accommodation place per stop, tagged is_accommodation
-- instead of a stop-level text field. Lat/lng left null — no real hotel
-- address is known, only the name; geocode for real via the app's own
-- "Find location" flow rather than inventing precision here.
-- ----------------------------------------------------------------------------
insert into public.places (trip_id, name, town, nearest_stop_id, note, added_by, booking_status)
select (select id from _seed_trip), 'Asuka (day-trip cycling area)', 'Asuka, Nara Prefecture',
       (select id from public.stops where trip_id = (select id from _seed_trip) and name = 'Kyoto'),
       '1,400-year-old cradle of Japan''s first state — gentle cycling through rice fields and ancient kofun burial mounds. Day-trip via Kintetsu line, returns to Kyoto same evening.',
       (select id from public.profiles where display_name = 'cliff.moffitt'), 'not_booked';

insert into public.places (trip_id, name, town, nearest_stop_id, added_by, booking_status, is_accommodation)
select (select id from _seed_trip), v.hotel_name, v.stop_town,
       (select id from public.stops where trip_id = (select id from _seed_trip) and name = v.stop_name),
       (select id from public.profiles where display_name = 'cliff.moffitt'), 'confirmed', true
from (values
    ('Tokyo', 'Yanaka, Tokyo', 'Edo Sakura'),
    ('Kyoto', 'Kyoto old quarter', 'Rokkon Guesthouse'),
    ('Tsuwano', 'Tsuwano, Shimane', 'Nomad Tsuwano'),
    ('Oasa', 'Kitahiroshima Town', 'Tanakaya'),
    ('Hiroshima', 'Central Hiroshima', 'KIRO Hiroshima'),
    ('Kumamoto', 'Kumamoto, Kyushu', 'Tudzura Inn')
  ) as v(stop_name, stop_town, hotel_name);

-- ----------------------------------------------------------------------------
-- Daily-plan Tips (13) — category 'Daily Plan' (now in trip.tip_categories,
-- see above), one per day, related_stop_id per the stop that day belongs
-- to. Each starts with its real date in plain text since tips has no
-- event_date column — sorts by eye, not by query. Small enough a gap to
-- accept for a one-time import; worth a real column if daily tips become a
-- recurring feature rather than a one-off.
-- ----------------------------------------------------------------------------
insert into public.tips (trip_id, category, format, content_text, related_stop_id, added_by)
select (select id from _seed_trip), 'Daily Plan', 'text', v.content,
       (select id from public.stops where trip_id = (select id from _seed_trip) and name = v.stop_name),
       (select id from public.profiles where display_name = v.author)
from (values
  ('Tokyo', 'cliff.moffitt', 'Day 1 — Mon 26 Oct — Tokyo (arrival). Arrival day, no agenda — make your own way from the airport to Edo Sakura. Rest, settle in. Evening: welcome dinner (paid) with a local Tokyo contact, arranged by Jonah. Breakfast/lunch: none (arrival day). Transport included: bus/train then taxi from Narita or Haneda — from Narita, N''EX to Shinjuku/Ikebukuro then taxi to Yanaka (~¥3,000 total). IC transit card waiting at the hotel. Today''s own-account budget: ¥3,000.'),
  ('Tokyo', 'cliff.moffitt', 'Day 2 — Tue 27 Oct — Tokyo (cycling). Cycling day — sokoiko! Tokyo. Back streets, small shrines, quiet neighbourhoods most tourists never see. Easy pace, guide meets near Tokyo Station, ride finishes by lunchtime, afternoon free. Breakfast paid (at Edo Sakura). Lunch paid (local restaurant, guide''s recommendation). Dinner own account — explore Yanaka/Nezu, small local places. Transport: bicycle, included. Guide speaks English; wear comfortable shoes; try Yanaka Ginza shopping street in the afternoon. Today''s own-account budget: ¥3,000.'),
  ('Kyoto', 'cliff.moffitt', 'Day 3 — Wed 28 Oct — Tokyo → Kyoto (travel). Slow morning in Yanaka, then Nozomi bullet train west — sit on the RIGHT side for a Mt Fuji view (~45min after departure, weather permitting). ~2h15min journey. Arrive Kyoto early afternoon, settle into Rokkon Guesthouse (a renovated machiya). Evening free. Breakfast paid. Lunch own account — buy an ekiben at Tokyo Station before boarding, ~¥1,200, highly recommended. Dinner own account — near Rokkon, a noodle shop or standing bar. Transport: Shinkansen, included, ticket delivered to Edo Sakura beforehand. Today''s own-account budget: ¥5,000.'),
  ('Kyoto', 'Sally', 'Day 4 — Thu 29 Oct — Kyoto (free day). Entirely open, no schedule. Jonah can suggest a hidden temple, an old-school kissaten, or a quiet riverside walk. Breakfast paid. Lunch own account (Nishiki Market, Gion, or wherever). Dinner own account — kaiseki, tofu cuisine, or a lively izakaya. Transport: walking/bus/subway, own account (IC card works on both). Suggested less-touristy spots: Fushimi Inari (early morning, fewer crowds), Philosopher''s Path, Nishiki Market, Arashiyama bamboo grove. Budget ~¥6,000/person for the day''s food. Today''s own-account budget: ¥12,000.'),
  ('Kyoto', 'cliff.moffitt', 'Day 5 — Fri 30 Oct — Kyoto + Asuka day-trip (cycling). Cycling day — sokoiko! Asuka. Short train south, gentle cycling through rice fields and ancient kofun burial mounds. Very peaceful. Return to Kyoto by evening. Breakfast paid. Lunch paid (local restaurant in Asuka, guide takes you). Dinner own account — back in Kyoto, ask Jonah for a recommendation near Rokkon. Transport: Kintetsu local train + bicycle, included. Asuka is very flat — easy even without recent cycling experience. Today''s own-account budget: ¥3,500.'),
  ('Tsuwano', 'Sally', 'Day 6 — Sat 31 Oct — Kyoto → Tsuwano (travel). Morning bullet train to Shin-Yamaguchi, then a small local train into the mountains. Arrive Tsuwano ("Little Kyoto of the West") late afternoon. Breakfast paid. Lunch own account — ekiben at Kyoto Station. Dinner: CHECK with Jonah — evening with a local sokoiko! community member, confirm whether included. Transport: Shinkansen + local mountain train (Yamaguchi line), included, both tickets provided. Owners of Nomad Tsuwano welcome you personally. Today''s own-account budget: ¥3,500.'),
  ('Tsuwano', 'cliff.moffitt', 'Day 7 — Sun 1 Nov — Tsuwano (cycling). Cycling day — sokoiko! Tsuwano. Traditional Japanese breakfast first, then cycling through the mountain town and countryside. Afternoon/evening free. Breakfast paid (traditional, at Nomad Tsuwano). Lunch paid (local restaurant, guide takes you). Dinner own account — quiet walk through town, small local restaurant. Transport: bicycle, included. Feed the koi in Tsuwano''s roadside channels. Taikodani Inari Shrine: 1,174 red torii gates, far less visited than Fushimi Inari. Today''s own-account budget: ¥3,500.'),
  ('Oasa', 'Sally', 'Day 8 — Mon 2 Nov — Tsuwano → Oasa (travel). Morning local train south through Hiroshima then inland to Oasa, Kitahiroshima Town — satoyama countryside. Jonah personally joins at Hamada Station. BBQ dinner waiting at Tanakaya. Breakfast paid. Lunch: none set, buy something at a station if hungry (own account). Dinner paid — relaxed BBQ at Tanakaya with Jonah and local community members. Transport: local train, multiple changes, included. Tanakaya is a private house reserved just for you. Today''s own-account budget: ¥1,500.'),
  ('Hiroshima', 'cliff.moffitt', 'Day 9 — Tue 3 Nov — Oasa → Hiroshima (cycling + travel). Cycling day — sokoiko! Oasa, then afternoon transfer to Hiroshima. Satoyama countryside cycling — rice fields, forest edges, farming villages. Afternoon: travel to Hiroshima, check into KIRO Hiroshima. Breakfast paid. Lunch paid (woven into the ride). Dinner own account — first night in Hiroshima, try okonomiyaki (Hiroshima-style). Transport: bicycle then train, included. Note: 3 Nov is Culture Day, a national holiday — some sites busier. Dinner spot: Hassho or Micchan near Hondori arcade. Today''s own-account budget: ¥4,000.'),
  ('Hiroshima', 'Sally', 'Day 10 — Wed 4 Nov — Hiroshima + Miyajima (cycling). Cycling day — sokoiko! Hiroshima + Miyajima. Cycle along Hiroshima''s six rivers — flat and relaxed. Afternoon: Miyajima Island (the floating torii gate), timing depends on tides (Jonah coordinates). Breakfast paid. Lunch paid (during the ride). Dinner own account — final Hiroshima dinner, oysters or ramen. Transport: bicycle + local train + ferry, included. Try momiji manju on Miyajima. Today''s own-account budget: ¥4,000.'),
  ('Kumamoto', 'cliff.moffitt', 'Day 11 — Thu 5 Nov — Hiroshima → Kumamoto (travel). Bullet train south into Kyushu. Kumamoto: known for its castle, ramen, and space to breathe. Arrive and settle in, rest of the day open. Breakfast paid. Lunch own account — bento at Hiroshima Station or on the train. Dinner own account — try Kumamoto ramen and basashi (horse sashimi). Transport: Shinkansen (Sakura service), included, ~1h20min. Kumamoto Castle badly damaged in the 2016 earthquake, under careful restoration. Today''s own-account budget: ¥7,000.'),
  ('Kumamoto', 'Sally', 'Day 12 — Fri 6 Nov — Kumamoto (free day). Last full day, intentionally open. Sleep in, find a café, walk to the castle, or don''t. Breakfast paid. Lunch own account — Shimotori covered shopping arcade has good spots. Dinner own account — final dinner of the journey. Transport: walking or city tram, own account (IC card works). Also worth a wander: Suizenji Jojuen Garden. Today''s own-account budget: ¥9,000.'),
  ('Kumamoto', 'cliff.moffitt', 'Day 13 — Sat 7 Nov — Departure (Kumamoto → Narita → Nairobi). Final breakfast at Tudzura, then to Kumamoto Airport (~40min taxi) for the domestic flight to Narita, connecting to the international flight home. Breakfast paid (final). Lunch: none included. Transport: domestic KMJ→NRT included, then onward international connection — allow 3–4hrs at Narita before international departure; duty-free is good there. Today''s own-account budget: ¥2,000.')
  ) as v(stop_name, author, content);

-- ----------------------------------------------------------------------------
-- Budget lines (10) — matching the sheet's own #1,2,5,6,8,9,10,11,12,13.
-- #3/#4 (flights) and #7 (visa document costs) have no firm figure in the
-- source sheet — deliberately left out, not seeded with an invented number.
-- amount_minor is whole units (JPY/KES have no minor unit in practice).
-- ----------------------------------------------------------------------------
insert into public.budget_lines (trip_id, category, description, amount_minor, currency, status, due_date, created_by)
select (select id from _seed_trip), v.category, v.description, v.amount_minor, v.currency, v.status::budget_status, v.due_date::date,
       (select id from public.profiles where display_name = 'cliff.moffitt')
from (values
    ('guided_tour', 'Journey deposit (30%) — Hope Bus Cooperative', 360000, 'JPY', 'paid', '2026-06-06'),
    ('guided_tour', 'Journey balance (70%) — Hope Bus Cooperative', 840000, 'JPY', 'pending', '2026-08-27'),
    ('visa', 'Cliff — tourist visa application fee', 3116, 'KES', 'pending', '2026-10-01'),
    ('visa', 'Sally — tourist visa application fee', 3116, 'KES', 'pending', '2026-10-01'),
    ('meals', 'Own-account meals, whole trip (both)', 56000, 'JPY', 'pending', null),
    ('shopping', 'Shopping — souvenirs, gifts, clothing', 80000, 'JPY', 'pending', null),
    ('meals', 'Snacks, drinks, coffees throughout', 8000, 'JPY', 'pending', null),
    ('other', 'Luggage forwarding, Kyoto → Hiroshima', 4000, 'JPY', 'pending', '2026-10-28'),
    ('other', 'Japan data SIM card', 4000, 'JPY', 'pending', null),
    ('other', 'Cash contingency (ATM top-ups)', 30000, 'JPY', 'pending', null)
  ) as v(category, description, amount_minor, currency, status, due_date);

-- ----------------------------------------------------------------------------
-- Packing items (36) — visa & document checklist. Split into genuinely
-- shared household actions (owner_id null, 6 items) vs. per-person
-- requirements (owner_id set, seeded as one row per person — 15 conceptual
-- items x 2 = 30 rows), rather than one shared checkbox for things that are
-- inherently two separate documents (a shared checkbox can't represent
-- "Sally's bank statement is ready, Cliff's isn't"). All 10 "documents to
-- bring" items are per-person per the source sheet's own "one set per
-- person" framing; item text itself already says "one per person" for the
-- visa application form.
-- ----------------------------------------------------------------------------
insert into public.packing_items (trip_id, owner_id, name, category, is_document, due_date)
select (select id from _seed_trip), null, v.name, 'Visa & Documents', true, v.due_date::date
from (values
    ('Book international flights (NBO↔NRT, confirmed booking required for visa)', '2026-07-31'),
    ('Print the sokoiko! itinerary + hotel confirmations', '2026-09-30'),
    ('Request travel insurance certificate from Jonah', '2026-09-30'),
    ('Submit everything at the Embassy of Japan, Gigiri (before noon, weekday)', '2026-10-01'),
    ('Return to collect passports with visas stamped', '2026-10-08'),
    ('Confirm with Jonah that travel documents (IC cards, tickets) have been sent', '2026-10-20')
  ) as v(name, due_date);

insert into public.packing_items (trip_id, owner_id, name, category, is_document, due_date)
select (select id from _seed_trip), (select id from public.profiles where display_name = owner.display_name),
       v.name, 'Visa & Documents', true, v.due_date::date
from (values ('cliff.moffitt'), ('Sally')) as owner(display_name),
  (values
    ('Check passport valid to at least 7 May 2027', current_date::text),
    ('Get certified bank statements, last 6 months', '2026-09-30'),
    ('Get employer letter (job title, approved leave dates, return-to-work confirmation)', '2026-09-30'),
    ('Get passport photos taken (2, white background, get 4–6 extra)', '2026-09-30'),
    ('Download + fill in visa application form (ke.emb-japan.go.jp)', '2026-10-07'),
    ('Valid passport (original, valid past May 2027)', '2026-10-01'),
    ('Completed, signed visa application form', '2026-10-01'),
    ('2 passport photos (white background, <6 months old)', '2026-10-01'),
    ('Certified bank statements (6 months)', '2026-10-01'),
    ('Employer letter', '2026-10-01'),
    ('Travel itinerary (the sokoiko! document)', '2026-10-01'),
    ('Hotel confirmations (covers all 12 nights)', '2026-10-01'),
    ('Confirmed return flight booking', '2026-10-01'),
    ('Travel insurance certificate', '2026-10-01'),
    ('Cover letter (1 page — who you are, why you''re going, how you''re paying)', '2026-10-01')
  ) as v(name, due_date);

commit;

-- ============================================================================
-- Verify after running:
--   select count(*) from stops s join trips t on t.id=s.trip_id where t.name like 'Cliff & Sally%';          -- expect 6
--   select count(*) from places p join trips t on t.id=p.trip_id where t.name like 'Cliff & Sally%';          -- expect 7
--   select count(*) from tips ti join trips t on t.id=ti.trip_id where t.name like 'Cliff & Sally%';          -- expect 13
--   select count(*) from budget_lines b join trips t on t.id=b.trip_id where t.name like 'Cliff & Sally%';    -- expect 10
--   select count(*) from packing_items pi join trips t on t.id=pi.trip_id where t.name like 'Cliff & Sally%'; -- expect 36
--   select count(*) from trip_members tm join trips t on t.id=tm.trip_id where t.name like 'Cliff & Sally%';  -- expect 2
-- ============================================================================
