import { z } from "zod";

// Trip name/description/date-range — shared by the Trip Settings form and
// the Supabase update (CONVENTIONS.md §3). Separate from
// trip-budget-settings.schema.ts, which owns budget_mode/cap/currency —
// two independent mutations on the same `trips` row, same pattern as
// place.schema.ts vs. place-media.schema.ts both updating `places`.
export const tripDetailsSchema = z
  .object({
    name: z.string().trim().min(1, "Name is required").max(200),
    description: z.string().trim().max(2000).nullable(),
    start_date: z.string().trim().min(1).nullable(),
    end_date: z.string().trim().min(1).nullable(),
  })
  .refine(
    (v) => !v.start_date || !v.end_date || v.end_date >= v.start_date,
    { message: "End date can't be before the start date", path: ["end_date"] },
  );

export type TripDetailsInput = z.infer<typeof tripDetailsSchema>;
