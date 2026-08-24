import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import type { PlaceCheckin } from "@/types/database.types";

export function usePlaceCheckins(tripId: string) {
  return useQuery({
    queryKey: ["place_checkins", tripId],
    queryFn: async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("place_checkins")
        .select("place_id, user_id, checked_in_at, places!inner(trip_id)")
        .eq("places.trip_id", tripId);

      if (error) throw error;
      return (data ?? []).map(
        ({ place_id, user_id, checked_in_at }): PlaceCheckin => ({
          place_id,
          user_id,
          checked_in_at,
        }),
      );
    },
  });
}

// Toggle, not a status field — same "nothing's a one-way door" pattern
// as useToggleCheckin (stops).
export function useTogglePlaceVisited(tripId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ placeId, visited }: { placeId: string; visited: boolean }) => {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Not signed in");

      if (visited) {
        const { error } = await supabase
          .from("place_checkins")
          .delete()
          .eq("place_id", placeId)
          .eq("user_id", user.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("place_checkins")
          .insert({ place_id: placeId, user_id: user.id });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["place_checkins", tripId] });
    },
  });
}
