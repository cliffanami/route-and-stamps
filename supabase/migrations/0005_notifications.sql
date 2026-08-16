-- ============================================================================
-- Route & Stamps — Notification triggers (ROADMAP.md M7)
-- notifications already exists (0001_init.sql) with is_instant/digested_at
-- and no INSERT policy at all — rows can only ever be created server-side,
-- so this is entirely SECURITY DEFINER trigger functions, same pattern as
-- handle_new_user/is_trip_member. Digest emailing (the GitHub Actions cron
-- + service-role-key + Resend piece) is deliberately not part of this
-- migration — routine notifications land with is_instant=false and
-- digested_at null and just sit there, visible in-app, until that exists.
-- ============================================================================

begin;

-- Shared by every trigger below — one row per trip member except the
-- actor, who doesn't need to be told about their own action.
create function public.notify_trip_members(
  p_trip_id uuid,
  p_type notification_type,
  p_payload jsonb,
  p_is_instant boolean,
  p_exclude_user_id uuid
)
returns void
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.notifications (trip_id, recipient_id, type, payload, is_instant)
  select p_trip_id, tm.user_id, p_type, p_payload, p_is_instant
  from public.trip_members tm
  where tm.trip_id = p_trip_id and tm.user_id != p_exclude_user_id;
end;
$$;

-- Fires once — the first time every current trip member has a must_go vote
-- on a place — not on every subsequent vote change afterward. Excludes the
-- voter whose vote just completed consensus; they were the one clicking,
-- no need to notify them of their own action.
create function public.notify_consensus_reached()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  v_trip_id uuid;
  v_place_name text;
  v_member_count integer;
  v_consensus_count integer;
  v_already_notified boolean;
begin
  select trip_id, name into v_trip_id, v_place_name
  from public.places where id = new.place_id;

  select count(*) into v_member_count
  from public.trip_members where trip_id = v_trip_id;

  select count(*) into v_consensus_count
  from public.votes v
  join public.trip_members tm on tm.trip_id = v_trip_id and tm.user_id = v.user_id
  where v.place_id = new.place_id and v.level = 'must_go';

  if v_member_count = 0 or v_consensus_count < v_member_count then
    return new;
  end if;

  select exists(
    select 1 from public.notifications
    where type = 'consensus_reached'
      and (payload->>'place_id')::uuid = new.place_id
  ) into v_already_notified;

  if v_already_notified then
    return new;
  end if;

  perform public.notify_trip_members(
    v_trip_id,
    'consensus_reached',
    jsonb_build_object('place_id', new.place_id, 'place_name', v_place_name),
    true,
    new.user_id
  );

  return new;
end;
$$;

create trigger votes_notify_consensus
  after insert or update on public.votes
  for each row execute function public.notify_consensus_reached();

-- Routine add — is_instant=false, digest-eligible once the email piece exists.
create function public.notify_place_added()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  v_added_by_name text;
begin
  select display_name into v_added_by_name
  from public.profiles where id = new.added_by;

  perform public.notify_trip_members(
    new.trip_id,
    'place_added',
    jsonb_build_object(
      'place_id', new.id,
      'place_name', new.name,
      'added_by_name', v_added_by_name
    ),
    false,
    new.added_by
  );

  return new;
end;
$$;

create trigger places_notify_added
  after insert on public.places
  for each row execute function public.notify_place_added();

create function public.notify_tip_added()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  v_added_by_name text;
begin
  select display_name into v_added_by_name
  from public.profiles where id = new.added_by;

  perform public.notify_trip_members(
    new.trip_id,
    'tip_added',
    jsonb_build_object(
      'tip_id', new.id,
      'category', new.category,
      'added_by_name', v_added_by_name
    ),
    false,
    new.added_by
  );

  return new;
end;
$$;

create trigger tips_notify_added
  after insert on public.tips
  for each row execute function public.notify_tip_added();

commit;
