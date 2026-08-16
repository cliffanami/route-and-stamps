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
  // Reminder fires via check_packing_reminders() (ROADMAP.md Milestone D) —
  // notifies the owner if set, or every trip member if shared.
  due_date: z.string().trim().min(1).nullable(),
});

export type PackingItemInput = z.infer<typeof packingItemSchema>;
