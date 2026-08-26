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

// Active check-in, replacing the old passive "mark as visited" toggle
// (ROADMAP.md Milestone Y) — same place_checkins table/model, same
// dimmed-marker treatment everywhere it renders, just a different
// trigger for writing to it. Checking into a place now also clears any
// *other* place_checkins row this user holds at a place sharing the same
// stop — mutual exclusivity scoped to "within one stop" (an accommodation
// vs. a place you're visiting in the same town), not trip-wide, since two
// people can reasonably be checked in at places in different stops at once
// if the trip data is a little behind.
export function useCheckInPlace(tripId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      placeId,
      checkedIn,
    }: {
      placeId: string;
      checkedIn: boolean;
    }) => {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Not signed in");

      if (checkedIn) {
        const { error } = await supabase
          .from("place_checkins")
          .delete()
          .eq("place_id", placeId)
          .eq("user_id", user.id);
        if (error) throw error;
        return;
      }

      const { data: place, error: placeError } = await supabase
        .from("places")
        .select("nearest_stop_id")
        .eq("id", placeId)
        .single();
      if (placeError) throw placeError;

      if (place.nearest_stop_id) {
        const { data: siblings, error: siblingsError } = await supabase
          .from("places")
          .select("id")
          .eq("nearest_stop_id", place.nearest_stop_id);
        if (siblingsError) throw siblingsError;

        const siblingIds = siblings.map((s) => s.id);
        if (siblingIds.length > 0) {
          const { error: clearError } = await supabase
            .from("place_checkins")
            .delete()
            .in("place_id", siblingIds)
            .eq("user_id", user.id);
          if (clearError) throw clearError;
        }
      }

      const { error } = await supabase
        .from("place_checkins")
        .insert({ place_id: placeId, user_id: user.id });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["place_checkins", tripId] });
    },
  });
}
