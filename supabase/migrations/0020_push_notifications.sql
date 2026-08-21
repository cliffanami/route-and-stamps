begin;

-- ROADMAP.md "Push notifications" — real OS-tray notifications while the
-- app isn't open. pg_net lets a Postgres trigger call out to the
-- send-push Edge Function the moment a notification row is inserted,
-- preserving the same "fires instantly" guarantee M7's in-app consensus
-- notification already has (a polling cron, like check_scheduled_arrivals
-- uses, would quietly break that for this case).
create extension if not exists pg_net with schema extensions;

-- One row per device/browser a user has granted permission on — a person
-- can have more than one (phone + laptop).
create table public.push_subscriptions (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles(id) on delete cascade,
  endpoint   text not null unique,
  p256dh     text not null,
  auth       text not null,
  created_at timestamptz not null default now()
);

create index idx_push_subscriptions_user on public.push_subscriptions(user_id);

alter table public.push_subscriptions enable row level security;

create policy "push_subscriptions_select_own" on public.push_subscriptions
  for select using (auth.uid() = user_id);
create policy "push_subscriptions_insert_own" on public.push_subscriptions
  for insert with check (auth.uid() = user_id);
create policy "push_subscriptions_delete_own" on public.push_subscriptions
  for delete using (auth.uid() = user_id);

-- Per-person, per-notification-type push preference — explicit config
-- rather than a fixed "these types always push" rule, since which alerts
-- are worth an OS interruption is a personal call, not a product one.
-- Defaults to the four notification types already marked is_instant=true
-- (consensus, arrival, packing due, joined) — routine place/tip adds stay
-- in-app-only by default, matching their existing digest-eligible
-- (is_instant=false) treatment, but every type is toggleable.
alter table public.profiles
  add column push_enabled_types notification_type[] not null
    default array['consensus_reached', 'arrival_estimated', 'packing_due', 'trip_joined']::notification_type[];

commit;
