-- One-off M0 seed: real trip dates + the seven stops from the sokoiko!
-- itinerary (Google Sheet), in itinerary order. Run once, after
-- supabase/seed-m0.sql has already created the Japan 2026 trip.
--
-- Coordinates are city/station-level centroids (general geographic
-- knowledge), not the exact hotel addresses — good enough for the stop
-- spine; individual places added later get precise coordinates from the
-- real Nominatim geocoder (M1).
--
-- Asuka gets its own stop despite being a day trip (not an overnight base)
-- from Kyoto: nearest_stop_id assignment for user-added places is
-- distance-based, and Asuka is geographically distinct from Kyoto — folding
-- it into "Kyoto" would misassign anything added near it. The itinerary's
-- own subtitle lists it as a separate named place too.

update public.trips
set start_date = '2026-10-26',
    end_date   = '2026-11-07'
where name = 'Japan 2026';

with trip as (
  select id from public.trips where name = 'Japan 2026'
)
insert into public.stops (trip_id, name, town, lat, lng, order_index, date_label, is_pending)
select trip.id, s.name, s.town, s.lat, s.lng, s.order_index, s.date_label, false
from trip, (values
  ('Tokyo',     'Tokyo',                   35.7272, 139.7671, 1, '26–27 Oct'),
  ('Kyoto',     'Kyoto',                   35.0116, 135.7681, 2, '28–30 Oct'),
  ('Asuka',     'Asuka, Nara Prefecture',  34.4816, 135.8168, 3, '30 Oct (day trip)'),
  ('Tsuwano',   'Tsuwano, Shimane',        34.4594, 131.7681, 4, '31 Oct – 1 Nov'),
  ('Oasa',      'Kitahiroshima, Hiroshima',34.6206, 132.5310, 5, '2–3 Nov'),
  ('Hiroshima', 'Hiroshima',               34.3978, 132.4753, 6, '3–4 Nov'),
  ('Kumamoto',  'Kumamoto, Kyushu',        32.8032, 130.7079, 7, '5–6 Nov')
) as s(name, town, lat, lng, order_index, date_label);
