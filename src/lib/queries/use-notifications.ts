import { useEffect, useId } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import type { Notification } from "@/types/database.types";

// Notifications are recipient-scoped, not trip-scoped the way
// use-realtime-subscription.ts's tables are — a separate, self-contained
// hook rather than forcing this into that one's trip_id-filtered shape.
export function useNotifications(tripId: string, userId: string | null) {
  const queryClient = useQueryClient();
  // NotificationBell (mounted in the trip layout) and NotificationsView
  // (the feed page) both call this hook for the same userId at the same
  // time — a bare `notifications-${userId}` channel name collided between
  // the two ("cannot add postgres_changes callbacks... after subscribe()",
  // caught via an unhandled rejection in dev, not by any assertion).
  // useId() gives each mounted instance its own channel.
  const instanceId = useId();

  const query = useQuery({
    queryKey: ["notifications", tripId, userId],
    enabled: userId !== null,
    queryFn: async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .eq("trip_id", tripId)
        .eq("recipient_id", userId!)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as Notification[];
    },
  });

  useEffect(() => {
    if (!userId) return;

    const supabase = createClient();
    let cancelled = false;
    let channel: ReturnType<typeof supabase.channel> | null = null;

    // Same wait-for-session-before-subscribing fix documented in
    // use-realtime-subscription.ts — subscribing before the client's
    // session hydration settles joins the channel with no/stale auth, so
    // every event gets silently filtered out by RLS with no error.
    supabase.auth.getSession().then(() => {
      if (cancelled) return;

      channel = supabase
        .channel(`notifications-${userId}-${instanceId}`)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "notifications",
            filter: `recipient_id=eq.${userId}`,
          },
          () => {
            queryClient.invalidateQueries({
              queryKey: ["notifications", tripId, userId],
            });
          },
        )
        .subscribe();
    });

    return () => {
      cancelled = true;
      if (channel) supabase.removeChannel(channel);
    };
  }, [tripId, userId, queryClient, instanceId]);

  return query;
}

export function useMarkNotificationRead(tripId: string, userId: string | null) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (notificationId: string) => {
      const supabase = createClient();
      const { error } = await supabase
        .from("notifications")
        .update({ read_at: new Date().toISOString() })
        .eq("id", notificationId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["notifications", tripId, userId],
      });
    },
  });
}

export function useMarkAllNotificationsRead(
  tripId: string,
  userId: string | null,
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      if (!userId) return;
      const supabase = createClient();
      const { error } = await supabase
        .from("notifications")
        .update({ read_at: new Date().toISOString() })
        .eq("trip_id", tripId)
        .eq("recipient_id", userId)
        .is("read_at", null);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["notifications", tripId, userId],
      });
    },
  });
}
