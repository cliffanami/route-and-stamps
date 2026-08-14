import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { placeSchema, type PlaceInput } from "@/lib/validation/place.schema";
import type { Place } from "@/types/database.types";

export function usePlaces(tripId: string) {
  return useQuery({
    queryKey: ["places", tripId],
    queryFn: async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("places")
        .select("*")
        .eq("trip_id", tripId)
        .order("created_at");

      if (error) throw error;
      return data as Place[];
    },
  });
}

// Not a query hook — called imperatively from the Add form before insert,
// via the nearby_places() SQL function already in schema.sql (ROADMAP.md M1).
export async function findNearbyPlaces(tripId: string, lat: number, lng: number) {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("nearby_places", {
    p_trip_id: tripId,
    p_lat: lat,
    p_lng: lng,
  });

  if (error) throw error;
  return (data ?? []) as Place[];
}

export function useAddPlace(tripId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: PlaceInput) => {
      const parsed = placeSchema.parse(input);
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Not signed in");

      const { data, error } = await supabase
        .from("places")
        .insert({ ...parsed, trip_id: tripId, added_by: user.id })
        .select()
        .single();

      if (error) throw error;
      return data as Place;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["places", tripId] });
    },
  });
}
