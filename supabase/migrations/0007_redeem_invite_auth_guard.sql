-- M8 security review: redeem_invite previously relied on trip_members.user_id's
-- NOT NULL constraint to incidentally reject an unauthenticated (anon) caller
-- with a generic Postgres constraint-violation error. Explicit auth check
-- instead — same fail-closed behavior, clean intentional error, and no
-- longer dependent on an unrelated column constraint to enforce it.
create or replace function public.redeem_invite(p_token uuid)
returns uuid
language plpgsql
security definer set search_path = public
as $$
declare
  v_trip_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Sign in required';
  end if;

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
