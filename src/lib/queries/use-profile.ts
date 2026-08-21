import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { profileSchema, type ProfileInput } from "@/lib/validation/profile.schema";
import { useCurrentUserId } from "./use-current-user";
import type { NotificationType, Profile } from "@/types/database.types";

// The signed-in user's own profiles row (ROADMAP.md Milestone A) — not
// trip-scoped, so no tripId in the query key, unlike every other query
// hook in this app.
export function useProfile() {
  const userId = useCurrentUserId();

  return useQuery({
    queryKey: ["profile", userId],
    queryFn: async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .single();

      if (error) throw error;
      return data as Profile;
    },
    enabled: userId !== null,
  });
}

export function useUpdateProfile() {
  const userId = useCurrentUserId();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: ProfileInput) => {
      if (!userId) throw new Error("Not signed in");
      const parsed = profileSchema.parse(input);
      const supabase = createClient();
      const { error } = await supabase
        .from("profiles")
        .update(parsed)
        .eq("id", userId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["profile", userId] });
    },
  });
}

// Separate from useUpdateProfile — this saves the moment a checkbox is
// toggled (ROADMAP.md "Push notifications" per-type config), not gated
// behind the display-name form's edit/save cycle.
export function useUpdatePushEnabledTypes() {
  const userId = useCurrentUserId();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (types: NotificationType[]) => {
      if (!userId) throw new Error("Not signed in");
      const supabase = createClient();
      const { error } = await supabase
        .from("profiles")
        .update({ push_enabled_types: types })
        .eq("id", userId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["profile", userId] });
    },
  });
}
