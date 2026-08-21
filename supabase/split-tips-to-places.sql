-- ============================================================================
-- One-off: split place-specific advice out of the 6 stop-level "Local Tips"
-- into new tips linked via related_place_id to the places that already
-- exist for them — tips.related_place_id existed but was never populated
-- for these. Genuinely stop-wide advice (Tsuwano's Mt Fuji seat/koi note,
-- Kyoto's IC card note, etc.) stays on the stop. Tokyo and Kumamoto have
-- no seeded places to extract to, so both are untouched.
--
-- Content verified against the live rows before writing this, not
-- against the seed script that originally created them.
-- ============================================================================

begin;

-- Kyoto: keep the stop-wide portion, drop Fushimi Inari + Rokkon Guesthouse.
update public.tips
set content_text = 'IC card works on Kyoto buses and subway. Ask Jonah for less-touristy spots — Philosopher''s Path and Arashiyama bamboo grove among the suggestions. Nishiki Market is good for food-stall lunches.'
where id = '95ca795a-ce85-481d-ae80-5cb613cafe30';

insert into public.tips (trip_id, category, format, content_text, related_place_id, added_by)
select p.trip_id, 'Local Tips', 'text', 'Go early morning to avoid crowds.', p.id,
       (select id from public.profiles where display_name = 'Sally')
from public.places p where p.name = 'Fushimi Inari Taisha' and p.trip_id = 'fbaf7e9b-ac66-4158-a2f2-32cabc4745e1';

insert into public.tips (trip_id, category, format, content_text, related_place_id, added_by)
select p.trip_id, 'Local Tips', 'text', 'A renovated machiya — wooden beams, a quiet inner courtyard.', p.id,
       (select id from public.profiles where display_name = 'Sally')
from public.places p where p.name = 'Rokkon Guesthouse' and p.trip_id = 'fbaf7e9b-ac66-4158-a2f2-32cabc4745e1';

-- Tsuwano: keep the Mt Fuji seat tip + koi/samurai-house note, drop
-- Taikodani Inari Shrine + Nomad Tsuwano.
update public.tips
set content_text = 'Sit on the RIGHT side of the train from Tokyo to Kyoto for the best Mt Fuji view (~45min after leaving Tokyo). Tsuwano is ''Little Kyoto of the West'' — white-walled samurai houses, koi swimming in roadside channels (buy fish food to feed them).'
where id = 'c110db38-6beb-4138-b356-3a38c1c407db';

insert into public.tips (trip_id, category, format, content_text, related_place_id, added_by)
select p.trip_id, 'Local Tips', 'text', 'Has 1,174 red torii gates, far less visited than Fushimi Inari.', p.id,
       (select id from public.profiles where display_name = 'cliff.moffitt')
from public.places p where p.name = 'Taikodani Inari Shrine' and p.trip_id = 'fbaf7e9b-ac66-4158-a2f2-32cabc4745e1';

insert into public.tips (trip_id, category, format, content_text, related_place_id, added_by)
select p.trip_id, 'Local Tips', 'text', 'The owners welcome you personally on arrival.', p.id,
       (select id from public.profiles where display_name = 'cliff.moffitt')
from public.places p where p.name = 'Nomad Tsuwano' and p.trip_id = 'fbaf7e9b-ac66-4158-a2f2-32cabc4745e1';

-- Oasa: keep the BBQ note, drop the Tanakaya description.
update public.tips
set content_text = 'The BBQ dinner with local community members is one of the more special evenings of the trip.'
where id = 'f238340b-66e7-4699-8353-a87615967818';

insert into public.tips (trip_id, category, format, content_text, related_place_id, added_by)
select p.trip_id, 'Local Tips', 'text', 'A private house reserved just for you — tatami mats, complete countryside silence.', p.id,
       (select id from public.profiles where display_name = 'Sally')
from public.places p where p.name = 'Tanakaya' and p.trip_id = 'fbaf7e9b-ac66-4158-a2f2-32cabc4745e1';

-- Hiroshima: keep the Miyajima/momiji manju note, drop the okonomiyaki
-- style note (now attached to the actual named restaurants instead).
update public.tips
set content_text = 'Miyajima''s torii gate appears to float at high tide; friendly wild deer on the island; try momiji manju (maple-leaf cakes, sweet red bean).'
where id = 'd267d3db-2001-4066-92ee-1981409e93df';

insert into public.tips (trip_id, category, format, content_text, related_place_id, added_by)
select p.trip_id, 'Local Tips', 'text', 'Try Hiroshima-style okonomiyaki — layered with noodles, different from Osaka style.', p.id,
       (select id from public.profiles where display_name = 'cliff.moffitt')
from public.places p where p.name = 'Hassho or Micchan (Hiroshima okonomiyaki)' and p.trip_id = 'fbaf7e9b-ac66-4158-a2f2-32cabc4745e1';

commit;

-- Verify after running: select count(*) from tips where trip_id =
-- 'fbaf7e9b-ac66-4158-a2f2-32cabc4745e1'; -- expect 11 (6 original, minus
-- 0 deleted, plus 5 new place-linked ones)
