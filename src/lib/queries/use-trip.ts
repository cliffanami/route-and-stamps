import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import {
  tripBudgetSettingsSchema,
  type TripBudgetSettingsInput,
} from "@/lib/validation/trip-budget-settings.schema";
import {
  tripDetailsSchema,
  type TripDetailsInput,
} from "@/lib/validation/trip-details.schema";
import {
  tripCategoryConfigSchema,
  type TripCategoryConfigInput,
} from "@/lib/validation/trip-category-config.schema";
import type { Trip } from "@/types/database.types";

export function useTrip(tripId: string) {
  return useQuery({
    queryKey: ["trip", tripId],
    queryFn: async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("trips")
        .select("*")
        .eq("id", tripId)
        .single();

      if (error) throw error;
      return data as Trip;
    },
  });
}

// Cap vs. tally mode, set per trip (ROADMAP.md M4). Tally mode always
// clears the cap fields — mirrors schema.sql's budget_cap_requires_currency
// check constraint (a lingering cap value from a previous "cap" session
// shouldn't silently reappear if the user switches back).
export function useUpdateTripBudgetSettings(tripId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: TripBudgetSettingsInput) => {
      const parsed = tripBudgetSettingsSchema.parse(
        input.budget_mode === "tally"
          ? { ...input, budget_cap: null, budget_cap_currency: null }
          : input,
      );
      const supabase = createClient();
      const { error } = await supabase
        .from("trips")
        .update(parsed)
        .eq("id", tripId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["trip", tripId] });
    },
  });
}

// Currency/category config lists (ROADMAP.md Milestone A follow-up) — each
// TagListEditor on the Settings page calls this with the full updated set
// of all three arrays on every add/remove, rather than a separate mutation
// per list; there's no partial-update RPC, so a full-row update is simplest.
export function useUpdateTripCategoryConfig(tripId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: TripCategoryConfigInput) => {
      const parsed = tripCategoryConfigSchema.parse(input);
      const supabase = createClient();
      const { error } = await supabase
        .from("trips")
        .update(parsed)
        .eq("id", tripId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["trip", tripId] });
    },
  });
}

// Name/description/date-range (ROADMAP.md Milestone A) — independent of
// the budget-settings mutation above, same "one schema, two enforcement
// points" pattern (CONVENTIONS.md §3).
export function useUpdateTripDetails(tripId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: TripDetailsInput) => {
      const parsed = tripDetailsSchema.parse(input);
      const supabase = createClient();
      const { error } = await supabase
        .from("trips")
        .update(parsed)
        .eq("id", tripId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["trip", tripId] });
    },
  });
}
