import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";

const SIGNED_URL_TTL_SECONDS = 60 * 60; // 1 hour

// place-photos is a private bucket (PRD §12c) — photo_url stores the Storage
// object path, not a fetchable URL, so display always goes through a signed
// URL (ROADMAP.md M2).
export function usePlacePhotoUrl(photoPath: string | null) {
  return useQuery({
    queryKey: ["place-photo-url", photoPath],
    queryFn: async () => {
      const supabase = createClient();
      const { data, error } = await supabase.storage
        .from("place-photos")
        .createSignedUrl(photoPath!, SIGNED_URL_TTL_SECONDS);

      if (error) throw error;
      return data.signedUrl;
    },
    enabled: photoPath !== null,
    staleTime: (SIGNED_URL_TTL_SECONDS - 60) * 1000,
  });
}
