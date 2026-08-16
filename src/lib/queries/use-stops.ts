import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import {
  stopLogisticsSchema,
  type StopLogisticsInput,
} from "@/lib/validation/stop-logistics.schema";
import { addStopSchema, type AddStopInput } from "@/lib/validation/add-stop.schema";
import { withSnapshotFallback } from "@/lib/offline/cache";
import type { Stop } from "@/types/database.types";

export function useStops(tripId: string) {
  return useQuery({
    queryKey: ["stops", tripId],
    queryFn: () =>
      withSnapshotFallback<Stop>("stops", tripId, async () => {
        const supabase = createClient();
        const { data, error } = await supabase
          .from("stops")
          .select("*")
          .eq("trip_id", tripId)
          .order("order_index");

        if (error) throw error;
        return data as Stop[];
      }),
  });
}

// The route itself is editable — appended to the end only, no reordering
// (a deliberate scope call, not a limitation of the schema). order_index
// is computed client-side rather than in SQL since there's no per-trip
// sequence to lean on; a genuine same-instant double-add from both members
// collides on the (trip_id, order_index) unique index, which is rare
// enough for two people that a "try again" message is a reasonable
// backstop rather than building real conflict resolution.
export function useAddStop(tripId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: AddStopInput) => {
      const parsed = addStopSchema.parse(input);
      const supabase = createClient();
      const { data: existing, error: fetchError } = await supabase
        .from("stops")
        .select("order_index")
        .eq("trip_id", tripId)
        .order("order_index", { ascending: false })
        .limit(1);
      if (fetchError) throw fetchError;

      const nextOrderIndex = (existing?.[0]?.order_index ?? 0) + 1;
      const { error } = await supabase
        .from("stops")
        .insert({ ...parsed, trip_id: tripId, order_index: nextOrderIndex });

      if (error) {
        if (error.code === "23505") {
          throw new Error(
            "Someone just added a stop — try again.",
          );
        }
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["stops", tripId] });
    },
  });
}

// Itinerary-linked logistics (ROADMAP.md M4) — a stop's hotel/meals/guide/
// flight fields, plus scheduling fields (ROADMAP.md Milestone D:
// start_date/end_date/arrival_time), edited via a small dialog on StopCard.
export function useUpdateStopLogistics(tripId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      stopId,
      ...input
    }: StopLogisticsInput & { stopId: string }) => {
      const parsed = stopLogisticsSchema.parse(input);
      const supabase = createClient();
      const { error } = await supabase
        .from("stops")
        .update(parsed)
        .eq("id", stopId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["stops", tripId] });
    },
  });
}
