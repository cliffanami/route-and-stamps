// Route & Stamps — send-push Edge Function (ROADMAP.md "Push notifications")
//
// Invoked exclusively by the notifications table's notify_push() trigger
// (migration 0021) via pg_net, never by the browser directly — that's why
// this checks a shared secret (x-internal-secret) instead of a Supabase
// user JWT. Deployed with --no-verify-jwt since pg_net's http_post call
// carries no user session to verify.
//
// Looks up the recipient's push_subscriptions, builds a human-readable
// title/body/url per notification type (mirroring
// NotificationsView.tsx's NOTIFICATION_META — kept separate rather than
// shared, since this runs in Deno, not the Next.js app), and sends via
// web-push. A 404/410 from the push service means that subscription is
// dead (browser data cleared, permission revoked, etc.) — deleted rather
// than retried.
import { createClient } from "npm:@supabase/supabase-js@2";
import webpush from "npm:web-push@3";

type NotificationType =
  | "consensus_reached"
  | "place_added"
  | "tip_added"
  | "vote_cast"
  | "arrival_estimated"
  | "packing_due"
  | "trip_joined";

interface PushRequestBody {
  notification_id: string;
  recipient_id: string;
  trip_id: string;
  type: NotificationType;
  payload: Record<string, string>;
}

const MESSAGE: Record<
  NotificationType,
  {
    title: string;
    body: (p: Record<string, string>) => string;
    url: (tripId: string, p: Record<string, string>) => string;
  }
> = {
  consensus_reached: {
    title: "Mutual Must Go",
    body: (p) => p.place_name ?? "A place",
    url: (tripId, p) => `/trips/${tripId}/places/${p.place_id}`,
  },
  place_added: {
    title: "New place added",
    body: (p) => `${p.added_by_name ?? "Someone"} added ${p.place_name ?? "a place"}`,
    url: (tripId, p) => `/trips/${tripId}/places/${p.place_id}`,
  },
  tip_added: {
    title: "New tip added",
    body: (p) => `${p.added_by_name ?? "Someone"} added a tip in ${p.category ?? "the trip"}`,
    url: (tripId) => `/trips/${tripId}/tips`,
  },
  vote_cast: {
    title: "New vote activity",
    body: () => "Someone voted on a place",
    url: (tripId) => `/trips/${tripId}/route`,
  },
  arrival_estimated: {
    title: "Arrival estimate",
    body: (p) => `Probably arriving in ${p.stop_name ?? "your next stop"} around now`,
    url: (tripId) => `/trips/${tripId}/route`,
  },
  packing_due: {
    title: "Packing reminder",
    body: (p) => p.item_name ?? "An item is due",
    url: (tripId) => `/trips/${tripId}/packing`,
  },
  trip_joined: {
    title: "Trip update",
    body: (p) =>
      p.joiner_name ? `${p.joiner_name} joined the trip` : `You joined ${p.trip_name ?? "the trip"}`,
    url: (tripId) => `/trips/${tripId}/members`,
  },
};

Deno.serve(async (req) => {
  const internalSecret = Deno.env.get("INTERNAL_PUSH_SECRET");
  if (!internalSecret || req.headers.get("x-internal-secret") !== internalSecret) {
    return new Response("Unauthorized", { status: 401 });
  }

  const body = (await req.json()) as PushRequestBody;
  const meta = MESSAGE[body.type];
  if (!meta) {
    return new Response(JSON.stringify({ skipped: "unknown type" }), { status: 200 });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const { data: subscriptions, error } = await supabase
    .from("push_subscriptions")
    .select("id, endpoint, p256dh, auth")
    .eq("user_id", body.recipient_id);

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
  if (!subscriptions || subscriptions.length === 0) {
    return new Response(JSON.stringify({ sent: 0 }), { status: 200 });
  }

  webpush.setVapidDetails(
    Deno.env.get("VAPID_SUBJECT")!,
    Deno.env.get("VAPID_PUBLIC_KEY")!,
    Deno.env.get("VAPID_PRIVATE_KEY")!,
  );

  const message = JSON.stringify({
    title: meta.title,
    body: meta.body(body.payload),
    url: meta.url(body.trip_id, body.payload),
  });

  let sent = 0;
  const staleIds: string[] = [];

  await Promise.all(
    subscriptions.map(async (sub) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: { p256dh: sub.p256dh, auth: sub.auth },
          },
          message,
        );
        sent++;
      } catch (err) {
        const statusCode = (err as { statusCode?: number }).statusCode;
        if (statusCode === 404 || statusCode === 410) {
          staleIds.push(sub.id);
        }
      }
    }),
  );

  if (staleIds.length > 0) {
    await supabase.from("push_subscriptions").delete().in("id", staleIds);
  }

  return new Response(JSON.stringify({ sent, removed: staleIds.length }), { status: 200 });
});
