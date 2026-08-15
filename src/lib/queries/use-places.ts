import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { placeSchema, type PlaceInput } from "@/lib/validation/place.schema";
import { placeMediaSchema } from "@/lib/validation/place-media.schema";
import { withSnapshotFallback } from "@/lib/offline/cache";
import { enqueue, isNetworkError } from "@/lib/offline/sync-queue";
import type { Place } from "@/types/database.types";

export function usePlaces(tripId: string) {
  return useQuery({
    queryKey: ["places", tripId],
    queryFn: () =>
      withSnapshotFallback<Place>("places", tripId, async () => {
        const supabase = createClient();
        const { data, error } = await supabase
          .from("places")
          .select("*")
          .eq("trip_id", tripId)
          .order("created_at");

        if (error) throw error;
        return data as Place[];
      }),
  });
}

// Selects a single place out of the same ["places", tripId] cache entry
// usePlaces already populates — the Place detail page (ROADMAP.md M2)
// doesn't need its own query key, and stays in sync with the same realtime
// invalidation every other place-reading view already relies on.
export function usePlace(tripId: string, placeId: string) {
  const query = usePlaces(tripId);
  return { ...query, data: query.data?.find((p) => p.id === placeId) };
}

// Not a query hook — called imperatively from the Add form before insert,
// via the nearby_places() SQL function already in schema.sql (ROADMAP.md M1).
export async function findNearbyPlaces(
  tripId: string,
  lat: number,
  lng: number,
) {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("nearby_places", {
    p_trip_id: tripId,
    p_lat: lat,
    p_lng: lng,
  });

  if (error) throw error;
  return (data ?? []) as Place[];
}

// Factored out so both the mutation below and the offline drain handler
// (lib/offline/sync-provider.tsx) call the exact same insert logic.
export async function insertPlace(
  tripId: string,
  parsed: PlaceInput,
): Promise<Place> {
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
}

// Offline write queue (ROADMAP.md M6): a network failure queues the add
// instead of failing it — validated first, so bad input never gets queued.
// No optimistic local echo of the queued place in the list; the pending-
// sync indicator (useSyncQueueListener) is what "visible pending-sync
// indicator" in the ROADMAP bullet refers to, not an optimistic list entry.
export function useAddPlace(tripId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: PlaceInput): Promise<Place | undefined> => {
      const parsed = placeSchema.parse(input);
      try {
        return await insertPlace(tripId, parsed);
      } catch (error) {
        if (isNetworkError(error)) {
          await enqueue({ type: "add_place", tripId, payload: parsed });
          queryClient.invalidateQueries({ queryKey: ["sync-queue-count"] });
          return undefined;
        }
        throw error;
      }
    },
    onSuccess: (result) => {
      if (result)
        queryClient.invalidateQueries({ queryKey: ["places", tripId] });
    },
  });
}

// Attaches/replaces a place's link (ROADMAP.md M2). Fetches oEmbed html via
// the Route Handler as a best-effort step — a failed embed fetch (private
// post, unconfigured Instagram token) still saves the link, just with
// embed_html left null, matching the graceful-degradation rule in
// ARCHITECTURE.md §1c's spirit for this milestone too.
export function useAttachPlaceEmbed(tripId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      placeId,
      sourceUrl,
    }: {
      placeId: string;
      sourceUrl: string | null;
    }) => {
      let embedHtml: string | null = null;

      if (sourceUrl) {
        const res = await fetch(
          `/api/embed?url=${encodeURIComponent(sourceUrl)}`,
        );
        if (res.ok) {
          embedHtml = ((await res.json()) as { html: string }).html;
        }
      }

      const parsed = placeMediaSchema
        .pick({ source_url: true, embed_html: true })
        .parse({ source_url: sourceUrl, embed_html: embedHtml });

      const supabase = createClient();
      const { error } = await supabase
        .from("places")
        .update(parsed)
        .eq("id", placeId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["places", tripId] });
    },
  });
}

// Uploads a photo to the private place-photos bucket (ROADMAP.md M2) and
// records its Storage object path — not a fetchable URL, since the bucket
// is private (PRD §12c); usePlacePhotoUrl resolves a signed URL for display.
export function useUploadPlacePhoto(tripId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ placeId, file }: { placeId: string; file: File }) => {
      const supabase = createClient();
      const path = `${tripId}/${placeId}/${Date.now()}-${file.name}`;

      const { error: uploadError } = await supabase.storage
        .from("place-photos")
        .upload(path, file, { upsert: true });
      if (uploadError) throw uploadError;

      const parsed = placeMediaSchema
        .pick({ photo_url: true })
        .parse({ photo_url: path });
      const { error } = await supabase
        .from("places")
        .update(parsed)
        .eq("id", placeId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["places", tripId] });
    },
  });
}
