import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import type { Vote, VoteLevel } from "@/types/database.types";

export function useVotes(tripId: string) {
  return useQuery({
    queryKey: ["votes", tripId],
    queryFn: async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("votes")
        .select("place_id, user_id, level, updated_at, places!inner(trip_id)")
        .eq("places.trip_id", tripId);

      if (error) throw error;
      return (data ?? []).map(
        ({ place_id, user_id, level, updated_at }): Vote => ({
          place_id,
          user_id,
          level,
          updated_at,
        }),
      );
    },
  });
}

export function useCastVote(tripId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ placeId, level }: { placeId: string; level: VoteLevel }) => {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Not signed in");

      const { error } = await supabase
        .from("votes")
        .upsert(
          { place_id: placeId, user_id: user.id, level },
          { onConflict: "place_id,user_id" },
        );

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["votes", tripId] });
    },
  });
}
