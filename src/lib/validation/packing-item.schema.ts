import { z } from "zod";

// Shared by PackingForm (React Hook Form resolver) and the Supabase insert
// (parse before insert) — one schema, two enforcement points
// (CONVENTIONS.md §3). owner_id null means a shared/trip-essentials item;
// a value means it's that user's personal item (ROADMAP.md M5).
export const packingItemSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(200),
  category: z.string().trim().max(60).nullable(),
  is_document: z.boolean(),
  owner_id: z.string().uuid().nullable(),
});

export type PackingItemInput = z.infer<typeof packingItemSchema>;
