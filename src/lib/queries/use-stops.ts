import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
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
