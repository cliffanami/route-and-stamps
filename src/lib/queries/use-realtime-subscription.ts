"use client";

import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";

// One hook per subscribed table, invalidating the relevant TanStack Query
// key on any change rather than patching the cache directly — simpler to
// reason about, and correct-by-construction since it re-fetches from the
// same RLS-secured source (CONVENTIONS.md §2).
export function useRealtimeSubscription(table: "places" | "votes", tripId: string) {
  const queryClient = useQueryClient();

  useEffect(() => {
    const supabase = createClient();
    let cancelled = false;
    let channel: ReturnType<typeof supabase.channel> | null = null;

    // Realtime's auth token sync happens via an async side effect of the
    // client's own session hydration — subscribing before that settles
    // joins the channel with no/stale auth, so every event gets silently
    // filtered out by RLS with no error anywhere. Explicitly waiting for
    // the session first is the fix (confirmed by watching a subscription
    // reach SUBSCRIBED and then never receive an insert made moments
    // later from a different session, until this wait was added).
    supabase.auth.getSession().then(() => {
      if (cancelled) return;

      channel = supabase
        .channel(`${table}-${tripId}`)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table,
            ...(table === "places" ? { filter: `trip_id=eq.${tripId}` } : {}),
          },
          () => {
            queryClient.invalidateQueries({ queryKey: [table, tripId] });
          },
        )
        .subscribe();
    });

    return () => {
      cancelled = true;
      if (channel) supabase.removeChannel(channel);
    };
  }, [table, tripId, queryClient]);
}
