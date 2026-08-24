import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import type { StopCheckin } from "@/types/database.types";

export function useStopCheckins(tripId: string) {
  return useQuery({
    queryKey: ["stop_checkins", tripId],
    queryFn: async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("stop_checkins")
        .select("stop_id, user_id, checked_in_at, stops!inner(trip_id)")
        .eq("stops.trip_id", tripId);

      if (error) throw error;
      return (data ?? []).map(
        ({ stop_id, user_id, checked_in_at }): StopCheckin => ({
          stop_id,
          user_id,
          checked_in_at,
        }),
      );
    },
  });
}

// Toggle, not a status field — tapping in when already checked in undoes
// it (delete-then-reinsert covers "I tapped by mistake"), same "nothing's
// a one-way door" pattern as a packing check or a budget status tag.
export function useToggleCheckin(tripId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ stopId, checkedIn }: { stopId: string; checkedIn: boolean }) => {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Not signed in");

      if (checkedIn) {
        const { error } = await supabase
          .from("stop_checkins")
          .delete()
          .eq("stop_id", stopId)
          .eq("user_id", user.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("stop_checkins")
          .insert({ stop_id: stopId, user_id: user.id });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["stop_checkins", tripId] });
    },
  });
}
