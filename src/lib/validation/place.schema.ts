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
});

export type PlaceInput = z.infer<typeof placeSchema>;
