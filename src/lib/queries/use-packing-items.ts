import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import {
  packingItemSchema,
  type PackingItemInput,
} from "@/lib/validation/packing-item.schema";
import type { PackingItem, PackingItemCheck } from "@/types/database.types";

export function usePackingItems(tripId: string) {
  return useQuery({
    queryKey: ["packing_items", tripId],
    queryFn: async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("packing_items")
        .select("*")
        .eq("trip_id", tripId)
        .order("created_at");

      if (error) throw error;
      return data as PackingItem[];
    },
  });
}

// Per-person completion for non-shared items — one row per (item, person),
// same join-through-trip_id pattern as useVotes (ROADMAP.md's per-person
// packing matrix, replacing the old duplicate-row-per-owner workaround).
export function usePackingItemChecks(tripId: string) {
  return useQuery({
    queryKey: ["packing_item_checks", tripId],
    queryFn: async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("packing_item_checks")
        .select("item_id, user_id, checked_at, packing_items!inner(trip_id)")
        .eq("packing_items.trip_id", tripId);

      if (error) throw error;
      return (data ?? []).map(
        ({ item_id, user_id, checked_at }): PackingItemCheck => ({
          item_id,
          user_id,
          checked_at,
        }),
      );
    },
  });
}

export function useAddPackingItem(tripId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: PackingItemInput) => {
      const parsed = packingItemSchema.parse(input);
      const supabase = createClient();
      const { error } = await supabase
        .from("packing_items")
        .insert({ ...parsed, trip_id: tripId });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["packing_items", tripId] });
    },
  });
}

// Editing name/category/is_shared/is_document — separate from
// useTogglePackingItem/useTogglePackingItemCheck, which own completion
// state.
export function useUpdatePackingItem(tripId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      ...input
    }: PackingItemInput & { id: string }) => {
      const parsed = packingItemSchema.parse(input);
      const supabase = createClient();
      const { error } = await supabase
        .from("packing_items")
        .update(parsed)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["packing_items", tripId] });
    },
  });
}

export function useDeletePackingItem(tripId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const supabase = createClient();
      const { error } = await supabase
        .from("packing_items")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["packing_items", tripId] });
    },
  });
}

// Shared items only — single is_checked flag, unchanged from before the
// matrix redesign.
export function useTogglePackingItem(tripId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      isChecked,
    }: {
      id: string;
      isChecked: boolean;
    }) => {
      const supabase = createClient();
      const { error } = await supabase
        .from("packing_items")
        .update({ is_checked: isChecked })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["packing_items", tripId] });
    },
  });
}

// Non-shared items — one packing_item_checks row per (item, current user).
// Upsert to check (matches castVote's shape for the same one-row-per-person
// pattern), delete to uncheck.
export function useTogglePackingItemCheck(tripId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      itemId,
      checked,
    }: {
      itemId: string;
      checked: boolean;
    }) => {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Not signed in");

      if (checked) {
        const { error } = await supabase
          .from("packing_item_checks")
          .upsert(
            { item_id: itemId, user_id: user.id },
            { onConflict: "item_id,user_id" },
          );
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("packing_item_checks")
          .delete()
          .eq("item_id", itemId)
          .eq("user_id", user.id);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["packing_item_checks", tripId],
      });
    },
  });
}
