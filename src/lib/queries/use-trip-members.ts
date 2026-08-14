import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";

export function useTripMembers(tripId: string) {
  return useQuery({
    queryKey: ["trip_members", tripId],
    queryFn: async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("trip_members")
        .select("user_id, role")
        .eq("trip_id", tripId);

      if (error) throw error;
      return data as { user_id: string; role: string }[];
    },
  });
}
