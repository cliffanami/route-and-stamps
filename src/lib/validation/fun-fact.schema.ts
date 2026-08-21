import { z } from "zod";

// Manual facts only — a wikipedia-sourced row is built directly by
// useFetchWikipediaFact, not through this form (ROADMAP.md Milestone F).
export const funFactSchema = z.object({
  body: z.string().trim().min(1, "A fact needs some text").max(2000),
  place_id: z.string().uuid().nullable(),
  stop_id: z.string().uuid().nullable(),
});

export type FunFactInput = z.infer<typeof funFactSchema>;
