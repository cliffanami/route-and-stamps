import { z } from "zod";

// Free-text logistics fields on a stop (ROADMAP.md M4) — shared by the
// StopCard edit dialog and the Supabase update (CONVENTIONS.md §3). Not a
// full stop schema; stop creation itself is still SQL-seeded only.
export const stopLogisticsSchema = z.object({
  hotel_info: z.string().trim().max(500).nullable(),
  meals_info: z.string().trim().max(500).nullable(),
  guide_info: z.string().trim().max(500).nullable(),
  flight_info: z.string().trim().max(500).nullable(),
  // Structured scheduling fields (ROADMAP.md Milestone D) — date_label
  // stays as a free-text override; these are what check_scheduled_arrivals()
  // actually reads. arrival_time is a full timestamp (flights especially);
  // start_date/end_date are date-only.
  start_date: z.string().trim().min(1).nullable(),
  end_date: z.string().trim().min(1).nullable(),
  arrival_time: z.string().trim().min(1).nullable(),
});

export type StopLogisticsInput = z.infer<typeof stopLogisticsSchema>;
