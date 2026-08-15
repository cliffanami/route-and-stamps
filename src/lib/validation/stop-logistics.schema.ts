import { z } from "zod";

// Free-text logistics fields on a stop (ROADMAP.md M4) — shared by the
// StopCard edit dialog and the Supabase update (CONVENTIONS.md §3). Not a
// full stop schema; stop creation itself is still SQL-seeded only.
export const stopLogisticsSchema = z.object({
  hotel_info: z.string().trim().max(500).nullable(),
  meals_info: z.string().trim().max(500).nullable(),
  guide_info: z.string().trim().max(500).nullable(),
  flight_info: z.string().trim().max(500).nullable(),
});

export type StopLogisticsInput = z.infer<typeof stopLogisticsSchema>;
