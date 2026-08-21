"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { urlBase64ToUint8Array } from "@/lib/push/vapid";
import { useCurrentUserId } from "./use-current-user";

function pushSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window
  );
}

async function getExistingSubscription(): Promise<PushSubscription | null> {
  if (!pushSupported()) return null;
  const registration = await navigator.serviceWorker.ready;
  return registration.pushManager.getSubscription();
}

// Whether *this device* already has an active push subscription — a
// person can be subscribed on their phone and not their laptop, so this
// is intentionally per-browser, not a single account-wide flag.
export function usePushSubscriptionStatus() {
  const userId = useCurrentUserId();

  return useQuery({
    queryKey: ["push-subscription-status", userId],
    queryFn: async () => {
      const subscription = await getExistingSubscription();
      return { subscribed: subscription !== null, supported: pushSupported() };
    },
    enabled: userId !== null,
  });
}

// Browsers require an explicit user gesture for Notification.requestPermission
// (ROADMAP.md "Push notifications") — this only ever runs from a click on
// the Profile page's toggle, never on load.
export function useEnablePush() {
  const userId = useCurrentUserId();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      if (!userId) throw new Error("Not signed in");
      if (!pushSupported()) {
        throw new Error("Push notifications aren't supported in this browser.");
      }

      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        throw new Error("Notification permission wasn't granted.");
      }

      const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      if (!publicKey) throw new Error("Push isn't configured yet.");

      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey) as unknown as BufferSource,
      });

      const json = subscription.toJSON();
      const supabase = createClient();
      const { error } = await supabase.from("push_subscriptions").insert({
        user_id: userId,
        endpoint: json.endpoint!,
        p256dh: json.keys!.p256dh,
        auth: json.keys!.auth,
      });
      // 23505 = unique violation on endpoint — this device is already
      // subscribed (e.g. a stale local PushManager subscription that
      // outlived its DB row's own re-creation); not a real failure.
      if (error && error.code !== "23505") throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["push-subscription-status", userId] });
    },
  });
}

export function useDisablePush() {
  const userId = useCurrentUserId();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const subscription = await getExistingSubscription();
      if (!subscription) return;

      const endpoint = subscription.endpoint;
      await subscription.unsubscribe();

      const supabase = createClient();
      await supabase.from("push_subscriptions").delete().eq("endpoint", endpoint);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["push-subscription-status", userId] });
    },
  });
}
