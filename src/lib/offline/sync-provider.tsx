"use client";

import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { drainQueue, type QueuedMutationType } from "./sync-queue";
import { insertPlace } from "@/lib/queries/use-places";
import { castVote } from "@/lib/queries/use-votes";
import { insertBudgetLine } from "@/lib/queries/use-budget-lines";
import type { PlaceInput } from "@/lib/validation/place.schema";
import type { BudgetLineInput } from "@/lib/validation/budget-line.schema";
import type { VoteLevel } from "@/types/database.types";

// Maps a queued mutation's type to the query key its entity is read
// through, so a successful drain invalidates the right list.
const ENTITY_FOR_TYPE: Record<QueuedMutationType, string> = {
  add_place: "places",
  cast_vote: "votes",
  add_budget_line: "budget_lines",
};

// Mounted once at the app root (providers.tsx) — drains the offline write
// queue on reconnect, and once on mount in case the app was reopened
// already online with items still queued from a previous session
// (ROADMAP.md M6).
export function SyncQueueListener() {
  const queryClient = useQueryClient();

  useEffect(() => {
    async function drain() {
      const synced = await drainQueue({
        add_place: async (tripId, payload) => {
          await insertPlace(tripId, payload as PlaceInput);
        },
        cast_vote: async (_tripId, payload) => {
          await castVote(payload as { placeId: string; level: VoteLevel });
        },
        add_budget_line: async (tripId, payload) => {
          await insertBudgetLine(tripId, payload as BudgetLineInput);
        },
      });

      if (synced.length > 0) {
        queryClient.invalidateQueries({ queryKey: ["sync-queue-count"] });
        for (const { type, tripId } of synced) {
          queryClient.invalidateQueries({
            queryKey: [ENTITY_FOR_TYPE[type], tripId],
          });
        }
      }
    }

    if (navigator.onLine) drain();
    window.addEventListener("online", drain);

    // The `online` event (and navigator.onLine) only reflects whether a
    // network interface is active, not whether it can actually reach
    // Supabase — confirmed by testing that a real network failure doesn't
    // flip navigator.onLine at all. That's exactly the "genuinely bad
    // signal, not just fast wifi" scenario PRD/ROADMAP.md M6 calls out as
    // the real target, not idealized airplane-mode toggling. This interval
    // is the fallback: drainQueue() is a no-op (fast) when the queue is
    // already empty, so polling costs nothing once there's nothing queued.
    const interval = setInterval(drain, 20_000);

    return () => {
      window.removeEventListener("online", drain);
      clearInterval(interval);
    };
  }, [queryClient]);

  return null;
}
