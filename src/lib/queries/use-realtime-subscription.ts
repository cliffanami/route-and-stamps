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
    const channel = supabase
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

    return () => {
      supabase.removeChannel(channel);
    };
  }, [table, tripId, queryClient]);
}
