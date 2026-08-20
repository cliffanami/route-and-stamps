import { z } from "zod";

// Shared by the Add-a-Place form (React Hook Form resolver) and the
// Supabase insert (parse before insert) — one schema, two enforcement
// points (CONVENTIONS.md §3). lat/lng/town/nearest_stop_id are set
// programmatically from the geocode Route Handler and nearest-stop
// calculation, not typed directly, but still validated before insert.
export const placeSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(200),
  source_url: z.string().trim().url("Must be a valid URL").nullable(),
  note: z.string().trim().max(2000).nullable(),
  lat: z.number().min(-90).max(90).nullable(),
  lng: z.number().min(-180).max(180).nullable(),
  town: z.string().max(200).nullable(),
  nearest_stop_id: z.string().uuid().nullable(),
  // A place can be more than one meal at once (e.g. a hotel restaurant
  // doing both breakfast and dinner) — array, not a single enum (ROADMAP.md
  // Milestone E).
  meal_tags: z.array(z.enum(["breakfast", "lunch", "dinner"])).default([]),
});

export type PlaceInput = z.infer<typeof placeSchema>;

// Editing a place (name/location/nearest-stop/note) is a separate mutation
// from source_url — that field stays owned by useAttachPlaceEmbed, which
// also fetches/clears the cached oEmbed HTML alongside it; updating it
// through this schema too would let source_url and embed_html drift out
// of sync with each other.
export const updatePlaceSchema = placeSchema.omit({ source_url: true });

export type UpdatePlaceInput = z.infer<typeof updatePlaceSchema>;
