import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { enqueue, isNetworkError } from "@/lib/offline/sync-queue";
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

interface CastVoteInput {
  placeId: string;
  level: VoteLevel;
}

// Factored out so both the mutation below and the offline drain handler
// (lib/offline/sync-provider.tsx) call the exact same upsert logic.
export async function castVote({
  placeId,
  level,
}: CastVoteInput): Promise<void> {
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
}

// Offline write queue (ROADMAP.md M6) — same network-failure-queues-it
// pattern as useAddPlace.
export function useCastVote(tripId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CastVoteInput) => {
      try {
        await castVote(input);
        return true;
      } catch (error) {
        if (isNetworkError(error)) {
          await enqueue({ type: "cast_vote", tripId, payload: input });
          queryClient.invalidateQueries({ queryKey: ["sync-queue-count"] });
          return false;
        }
        throw error;
      }
    },
    onSuccess: (synced) => {
      if (synced)
        queryClient.invalidateQueries({ queryKey: ["votes", tripId] });
    },
  });
}
