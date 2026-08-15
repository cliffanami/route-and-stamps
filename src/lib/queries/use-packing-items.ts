import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import {
  packingItemSchema,
  type PackingItemInput,
} from "@/lib/validation/packing-item.schema";
import type { PackingItem } from "@/types/database.types";

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
