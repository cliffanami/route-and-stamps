import { z } from "zod";

// Shared by AddStopForm (React Hook Form resolver) and the Supabase insert
// (parse before insert) — one schema, two enforcement points
// (CONVENTIONS.md §3). Unlike places, a stop's lat/lng are required
// (schema.sql: not null) — AddStopForm keeps Save disabled until a geocode
// result exists, so this schema never actually sees a null pair, but the
// type stays non-nullable to make that contract explicit rather than
// silently accepting an unlocated stop.
export const addStopSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(200),
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  town: z.string().max(200).nullable(),
  // Real calendar-picker dates at creation time, not a free-text guess —
  // date_label still exists as an optional override, editable later via
  // StopLogisticsForm, for the rare case a clean date range can't
  // represent what's actually planned.
  start_date: z.string().trim().min(1).nullable(),
  end_date: z.string().trim().min(1).nullable(),
});

export type AddStopInput = z.infer<typeof addStopSchema>;
