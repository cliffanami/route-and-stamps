begin;

-- Fires the moment a notification row lands, same "instant" guarantee the
-- in-app consensus path already has (ROADMAP.md "Push notifications").
-- push_enabled_types (0020) is the *only* gate — deliberately independent
-- of is_instant, since that column governs in-app digest-eligibility, not
-- whether a person has opted a given type into OS-level push.
create function public.notify_push()
returns trigger
language plpgsql
security definer set search_path = public, vault
as $$
declare
  v_secret text;
  v_types notification_type[];
begin
  select push_enabled_types into v_types
  from public.profiles where id = new.recipient_id;

  if v_types is null or not (new.type = any(v_types)) then
    return new;
  end if;

  select decrypted_secret into v_secret
  from vault.decrypted_secrets where name = 'internal_push_secret';

  -- Fire-and-forget: pg_net queues the request and returns immediately,
  -- so a slow or failing push send never blocks the notification insert
  -- itself. send-push (the Edge Function on the other end) is what
  -- actually looks up the recipient's push_subscriptions and sends via
  -- web-push — this trigger doesn't need to know whether any exist.
  perform net.http_post(
    url := 'https://uquriyxnrqxsdcpcrbmr.supabase.co/functions/v1/send-push',
    body := jsonb_build_object(
      'notification_id', new.id,
      'recipient_id', new.recipient_id,
      'trip_id', new.trip_id,
      'type', new.type,
      'payload', new.payload
    ),
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-internal-secret', v_secret
    )
  );

  return new;
end;
$$;

create trigger notifications_notify_push
  after insert on public.notifications
  for each row execute function public.notify_push();

commit;
