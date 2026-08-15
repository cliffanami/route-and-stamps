import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import {
  stopLogisticsSchema,
  type StopLogisticsInput,
} from "@/lib/validation/stop-logistics.schema";
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

// Itinerary-linked logistics (ROADMAP.md M4) — a stop's hotel/meals/guide/
// flight fields, edited via a small dialog on StopCard.
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
