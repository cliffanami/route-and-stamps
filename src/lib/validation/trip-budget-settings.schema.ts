import { z } from "zod";

// Shared by the Budget page's settings panel and the Supabase update
// (CONVENTIONS.md §3). Mirrors schema.sql's budget_cap_requires_currency
// check constraint: a cap needs a currency, and "tally" mode carries
// neither — enforced here too so a bad payload never reaches the DB
// constraint as the first line of defense.
export const tripBudgetSettingsSchema = z
  .object({
    budget_mode: z.enum(["cap", "tally"]),
    budget_cap: z.number().positive().nullable(),
    budget_cap_currency: z
      .string()
      .trim()
      .toUpperCase()
      .length(3, "Use a 3-letter currency code, e.g. KES")
      .nullable(),
  })
  .refine(
    (v) =>
      v.budget_mode !== "cap" ||
      (v.budget_cap !== null && v.budget_cap_currency !== null),
    {
      message: "A cap needs an amount and a currency",
      path: ["budget_cap"],
    },
  );

export type TripBudgetSettingsInput = z.infer<typeof tripBudgetSettingsSchema>;
