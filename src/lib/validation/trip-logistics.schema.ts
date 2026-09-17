import { z } from "zod";

// Its own schema/mutation rather than folded into trip-details.schema.ts or
// trip-category-config.schema.ts — same "one concern, one schema" pattern
// those two already establish on the same `trips` row (CONVENTIONS.md §3).
// Luggage forwarding doesn't fit either existing concern (name/dates, or
// config-list arrays), so it gets its own (ROADMAP.md Milestone AA).
export const tripLogisticsSchema = z.object({
  luggage_forwarding_enabled: z.boolean(),
});

export type TripLogisticsInput = z.infer<typeof tripLogisticsSchema>;
