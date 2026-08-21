import { useEffect, useRef } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { funFactSchema, type FunFactInput } from "@/lib/validation/fun-fact.schema";
import { withSnapshotFallback } from "@/lib/offline/cache";
import type { FunFact, Stop } from "@/types/database.types";

const REFETCH_INTERVAL_MS = 15 * 60 * 1000;

// refetchInterval re-runs this same query function every 15 minutes
// (ROADMAP.md Milestone F) — that's what lets the feed rotate to a
// different cached fact without a manual refresh. It only re-reads
// fun_facts, it never re-hits the Wikipedia API, so the cadence costs
// nothing extra.
export function useFunFacts(tripId: string) {
  return useQuery({
    queryKey: ["fun_facts", tripId],
    queryFn: () =>
      withSnapshotFallback<FunFact>("fun_facts", tripId, async () => {
        const supabase = createClient();
        const { data, error } = await supabase
          .from("fun_facts")
          .select("*")
          .eq("trip_id", tripId)
          .order("created_at");

        if (error) throw error;
        return data as FunFact[];
      }),
    refetchInterval: REFETCH_INTERVAL_MS,
  });
}

export function useAddFunFact(tripId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: FunFactInput) => {
      const parsed = funFactSchema.parse(input);
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Not signed in");

      const { error } = await supabase.from("fun_facts").insert({
        ...parsed,
        trip_id: tripId,
        source: "manual",
        added_by: user.id,
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["fun_facts", tripId] });
    },
  });
}

export function useDeleteFunFact(tripId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (factId: string) => {
      const supabase = createClient();
      const { error } = await supabase.from("fun_facts").delete().eq("id", factId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["fun_facts", tripId] });
    },
  });
}

// One-shot fetch-and-cache for a single stop's city name — the caller
// (useAutoFetchFunFacts) is responsible for only calling this once per
// stop that doesn't already have a wikipedia-sourced row, so a page
// reload doesn't re-hit the API for a stop already cached. That
// client-side guard is a courtesy, not the real safety net: a genuine
// double-mount (confirmed via React StrictMode's dev-only double-invoke,
// which recreates the guard's useRef and defeats it) can still fire this
// twice, so idx_fun_facts_wikipedia_per_stop (migration 0023) is the
// actual source of truth — a 23505 unique-violation here just means
// another call already won the race, not a real failure.
export function useFetchWikipediaFact(tripId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ stopId, title }: { stopId: string; title: string }) => {
      const res = await fetch(`/api/fun-facts?title=${encodeURIComponent(title)}`);
      if (!res.ok) return;
      const body = (await res.json()) as { extract: string | null };
      if (!body.extract) return;

      const supabase = createClient();
      const { error } = await supabase.from("fun_facts").insert({
        trip_id: tripId,
        stop_id: stopId,
        place_id: null,
        source: "wikipedia",
        body: body.extract,
        added_by: null,
      });
      if (error && error.code !== "23505") throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["fun_facts", tripId] });
    },
  });
}

// Fires the one-shot fetch above for every stop that doesn't already have
// a cached wikipedia fact — the DB check (not just the in-session ref) is
// what actually prevents re-fetching on a later page load; the ref only
// stops this same mount from firing the same stop twice while its own
// mutation is still in flight.
export function useAutoFetchFunFacts(
  tripId: string,
  stops: Stop[],
  facts: FunFact[],
) {
  const fetchWikipedia = useFetchWikipediaFact(tripId);
  const attemptedRef = useRef(new Set<string>());

  useEffect(() => {
    const stopsWithFacts = new Set(
      facts.filter((f) => f.source === "wikipedia" && f.stop_id).map((f) => f.stop_id),
    );
    for (const stop of stops) {
      if (!stop.name.trim()) continue;
      if (stopsWithFacts.has(stop.id)) continue;
      if (attemptedRef.current.has(stop.id)) continue;
      attemptedRef.current.add(stop.id);
      fetchWikipedia.mutate({ stopId: stop.id, title: stop.name });
    }
    // fetchWikipedia (a useMutation result) isn't included — it's a new
    // object every render, and its identity isn't what this effect should
    // react to; only a real change in stops/facts should.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stops, facts]);
}
