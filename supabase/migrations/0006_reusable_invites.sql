-- Reusable-until-expiry-or-revoked invites: drop single-redemption columns,
-- add revocation. Multiple people now redeem the same token; who-joined is
-- tracked via trip_members rows, not a single used_by/used_at pair.
alter table public.trip_invites
  drop column used_by,
  drop column used_at,
  add column revoked_at timestamptz;

-- Close the gap: this policy let any authenticated user insert themselves
-- into ANY trip's membership by guessing a trip_id — the real gate was
-- meant to live in application code that was never written. Membership
-- inserts now only happen via redeem_invite() below.
drop policy "trip_members_insert_via_invite" on public.trip_members;

-- Owners/members need to revoke their own trip's invites.
create policy "trip_invites_update_member" on public.trip_invites
  for update using (public.is_trip_member(trip_id));

-- ----------------------------------------------------------------------------
-- resolve_invite_preview — public, unauthenticated-safe teaser for the
-- /invite/[token] page. Deliberately excludes individual places, photos,
-- votes, and budget figures per the agreed teaser boundary. security definer
-- because the caller has no trip_members row yet (that's the whole point).
-- ----------------------------------------------------------------------------
create function public.resolve_invite_preview(p_token uuid)
returns table (
  trip_id       uuid,
  trip_name     text,
  start_date    date,
  end_date      date,
  stop_cities   text[],
  place_count   bigint,
  tip_count     bigint,
  inviter_name  text,
  is_valid      boolean
)
language plpgsql
security definer set search_path = public
as $$
begin
  return query
  select
    t.id,
    t.name,
    t.start_date,
    t.end_date,
    coalesce(
      (select array_agg(s.name order by s.order_index)
       from public.stops s where s.trip_id = t.id),
      '{}'
    ),
    (select count(*) from public.places p where p.trip_id = t.id),
    (select count(*) from public.tips tp where tp.trip_id = t.id),
    prof.display_name,
    (i.revoked_at is null and i.expires_at > now())
  from public.trip_invites i
  join public.trips t on t.id = i.trip_id
  join public.profiles prof on prof.id = i.created_by
  where i.token = p_token;
end;
$$;

-- ----------------------------------------------------------------------------
-- redeem_invite — the only path into trip_members besides being the trip
-- creator. Validates expiry/revocation server-side (never trust the client's
-- read of is_valid), idempotent via on conflict do nothing so re-clicking
-- a join link (or a second use by the same already-joined user) is a no-op
-- rather than an error.
-- ----------------------------------------------------------------------------
create function public.redeem_invite(p_token uuid)
returns uuid
language plpgsql
security definer set search_path = public
as $$
declare
  v_trip_id uuid;
begin
  select trip_id into v_trip_id
  from public.trip_invites
  where token = p_token
    and revoked_at is null
    and expires_at > now();

  if v_trip_id is null then
    raise exception 'Invite is invalid, expired, or revoked';
  end if;

  insert into public.trip_members (trip_id, user_id, role)
  values (v_trip_id, auth.uid(), 'member')
  on conflict (trip_id, user_id) do nothing;

  return v_trip_id;
end;
$$;
