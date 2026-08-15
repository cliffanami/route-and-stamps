import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { tipSchema, type TipInput } from "@/lib/validation/tip.schema";
import { withSnapshotFallback } from "@/lib/offline/cache";
import type { Tip } from "@/types/database.types";

export function useTips(tripId: string) {
  return useQuery({
    queryKey: ["tips", tripId],
    queryFn: () =>
      withSnapshotFallback<Tip>("tips", tripId, async () => {
        const supabase = createClient();
        const { data, error } = await supabase
          .from("tips")
          .select("*")
          .eq("trip_id", tripId)
          .order("created_at");

        if (error) throw error;
        return data as Tip[];
      }),
  });
}

// A tip's content is known at creation time (unlike a place, where media is
// attached in a later step) — fetch oEmbed inline for video tips in the same
// mutation, best-effort: a failed fetch still saves the tip with embed_html
// left null, same graceful-degradation posture as useAttachPlaceEmbed.
export function useAddTip(tripId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: Omit<TipInput, "embed_html">) => {
      let embedHtml: string | null = null;

      if (input.format === "video" && input.source_url) {
        const res = await fetch(
          `/api/embed?url=${encodeURIComponent(input.source_url)}`,
        );
        if (res.ok) {
          embedHtml = ((await res.json()) as { html: string }).html;
        }
      }

      const parsed = tipSchema.parse({ ...input, embed_html: embedHtml });
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Not signed in");

      const { error } = await supabase
        .from("tips")
        .insert({ ...parsed, trip_id: tripId, added_by: user.id });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tips", tripId] });
    },
  });
}

// Same oEmbed-refresh behavior as useAddTip — editing a video tip's link
// re-fetches the embed rather than leaving a stale one from the old URL.
export function useUpdateTip(tripId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      tipId,
      ...input
    }: Omit<TipInput, "embed_html"> & { tipId: string }) => {
      let embedHtml: string | null = null;

      if (input.format === "video" && input.source_url) {
        const res = await fetch(
          `/api/embed?url=${encodeURIComponent(input.source_url)}`,
        );
        if (res.ok) {
          embedHtml = ((await res.json()) as { html: string }).html;
        }
      }

      const parsed = tipSchema.parse({ ...input, embed_html: embedHtml });
      const supabase = createClient();
      const { error } = await supabase
        .from("tips")
        .update(parsed)
        .eq("id", tipId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tips", tripId] });
    },
  });
}

export function useDeleteTip(tripId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (tipId: string) => {
      const supabase = createClient();
      const { error } = await supabase.from("tips").delete().eq("id", tipId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tips", tripId] });
    },
  });
}
