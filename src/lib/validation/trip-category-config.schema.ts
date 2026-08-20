import { z } from "zod";

const categoryItem = z.string().trim().min(1).max(50);
const currencyItem = z
  .string()
  .trim()
  .toUpperCase()
  .length(3, "Use a 3-letter currency code, e.g. KES");

// The per-trip config lists behind Trip Settings' dropdowns (ROADMAP.md
// Milestone A follow-up) — currency/category fields elsewhere in the app
// (budget cap, cost lines, tips) are strict selects sourced from these
// arrays rather than free text. Independent of trip-details.schema.ts and
// trip-budget-settings.schema.ts — three separate mutations on the same
// `trips` row, same "one concern, one schema" pattern already used there.
export const tripCategoryConfigSchema = z.object({
  currencies: z.array(currencyItem).max(20),
  tip_categories: z.array(categoryItem).max(50),
  budget_categories: z.array(categoryItem).max(50),
});

export type TripCategoryConfigInput = z.infer<typeof tripCategoryConfigSchema>;
