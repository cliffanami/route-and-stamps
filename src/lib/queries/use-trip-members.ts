import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";

export interface TripMember {
  user_id: string;
  role: string;
  displayName: string;
  joined_at: string;
}

// Joins profiles via trip_members.user_id's FK (schema.sql) — readable by
// any authenticated trip member per profiles' own RLS policy, whose
// comment already calls out this exact use case ("needed to show 'added
// by Sally'"). Lets PlaceRow show each member's own name next to their
// vote, not just an anonymous member id.
export function useTripMembers(tripId: string) {
  return useQuery({
    queryKey: ["trip_members", tripId],
    queryFn: async (): Promise<TripMember[]> => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("trip_members")
        .select("user_id, role, joined_at, profiles(display_name)")
        .eq("trip_id", tripId);

      if (error) throw error;
      return (data ?? []).map((row) => ({
        user_id: row.user_id,
        role: row.role,
        joined_at: row.joined_at,
        displayName:
          (row.profiles as { display_name: string } | null)?.display_name ??
          "Trip member",
      }));
    },
  });
}
