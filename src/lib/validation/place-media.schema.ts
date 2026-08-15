import { z } from "zod";

// Shared by the media-attach mutation (React state) and the Supabase update
// (parse before update) — one schema, two enforcement points (CONVENTIONS.md
// §3). Separate from placeSchema: attaching media is a distinct mutation
// from creating a place (ROADMAP.md M2).
export const placeMediaSchema = z.object({
  source_url: z.string().trim().url("Must be a valid URL").nullable(),
  embed_html: z.string().nullable(),
  photo_url: z.string().nullable(),
});

export type PlaceMediaInput = z.infer<typeof placeMediaSchema>;

const ALLOWED_PHOTO_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_PHOTO_BYTES = 10 * 1024 * 1024; // 10MB

// Validates a File, not form field values — a plain check rather than a Zod
// object schema, since File objects aren't meaningfully Zod-parseable.
export function validatePhotoFile(file: File): string | null {
  if (!ALLOWED_PHOTO_TYPES.includes(file.type)) {
    return "Photo must be a JPEG, PNG, or WebP image.";
  }
  if (file.size > MAX_PHOTO_BYTES) {
    return "Photo must be smaller than 10MB.";
  }
  return null;
}
