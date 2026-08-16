import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import type { TripInvite } from "@/types/database.types";

// One trip can have multiple non-expired invite rows over time (a revoked
// one, then a fresh one created after) — the Members page only cares about
// the current active one, so this filters to unrevoked-and-unexpired and
// takes the most recent.
export function useActiveTripInvite(tripId: string) {
  return useQuery({
    queryKey: ["trip_invites", tripId, "active"],
    queryFn: async (): Promise<TripInvite | null> => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("trip_invites")
        .select("*")
        .eq("trip_id", tripId)
        .is("revoked_at", null)
        .gt("expires_at", new Date().toISOString())
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      return data as TripInvite | null;
    },
  });
}

export function useCreateTripInvite(tripId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Not signed in");

      const { error } = await supabase
        .from("trip_invites")
        .insert({ trip_id: tripId, created_by: user.id });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["trip_invites", tripId] });
    },
  });
}

export function useRevokeTripInvite(tripId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (token: string) => {
      const supabase = createClient();
      const { error } = await supabase
        .from("trip_invites")
        .update({ revoked_at: new Date().toISOString() })
        .eq("token", token);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["trip_invites", tripId] });
    },
  });
}
