-- ============================================================================
-- Route & Stamps — notify on join (ROADMAP.md Milestone B)
-- Two notifications, both gated on genuine new membership (re-visiting an
-- already-used invite link must stay a no-op, per the existing
-- on-conflict-do-nothing behavior): a direct welcome to the joiner, and a
-- notify_trip_members() call telling the existing members someone joined.
-- Every other trigger in this app notifies OTHER members about an actor's
-- action, excluding the actor — welcoming the joiner is a deliberate,
-- singular inversion of that; pairing it with the other-direction call
-- keeps both sides covered rather than picking one.
-- ============================================================================

begin;

create or replace function public.redeem_invite(p_token uuid)
returns uuid
language plpgsql
security definer set search_path = public
as $$
declare
  v_trip_id uuid;
  v_already_member boolean;
  v_trip_name text;
  v_joiner_name text;
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

  select exists(
    select 1 from public.trip_members
    where trip_id = v_trip_id and user_id = auth.uid()
  ) into v_already_member;

  insert into public.trip_members (trip_id, user_id, role)
  values (v_trip_id, auth.uid(), 'member')
  on conflict (trip_id, user_id) do nothing;

  if not v_already_member then
    select name into v_trip_name from public.trips where id = v_trip_id;
    select display_name into v_joiner_name from public.profiles where id = auth.uid();

    insert into public.notifications (trip_id, recipient_id, type, payload, is_instant)
    values (v_trip_id, auth.uid(), 'trip_joined', jsonb_build_object('trip_name', v_trip_name), true);

    perform public.notify_trip_members(
      v_trip_id,
      'trip_joined',
      jsonb_build_object('joiner_name', v_joiner_name),
      true,
      auth.uid()
    );
  end if;

  return v_trip_id;
end;
$$;

commit;
