import { z } from "zod";

// Shared by BudgetForm (React Hook Form resolver) and the Supabase insert
// (parse before insert) — one schema, two enforcement points
// (CONVENTIONS.md §3). amount_minor is computed from the form's decimal
// amount via lib/money/currency.ts's toMinorUnits before this schema sees
// it — the schema validates the already-converted integer, never a float.
export const budgetLineSchema = z.object({
  category: z.string().trim().min(1, "Category is required").max(60),
  description: z.string().trim().min(1, "Description is required").max(500),
  amount_minor: z.number().int().positive("Amount must be greater than zero"),
  currency: z
    .string()
    .trim()
    .toUpperCase()
    .length(3, "Use a 3-letter currency code, e.g. JPY"),
  status: z.enum(["not_booked", "pending", "paid"]),
  paid_by: z.string().uuid().nullable(),
  payment_details: z.string().trim().max(500).nullable(),
  due_date: z.string().nullable(),
  // Optional link to the place this cost is for (ROADMAP.md Milestone B).
  place_id: z.string().uuid().nullable(),
});

export type BudgetLineInput = z.infer<typeof budgetLineSchema>;
