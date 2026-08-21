import { z } from "zod";

// Shared by PackingForm (React Hook Form resolver) and the Supabase insert
// (parse before insert) — one schema, two enforcement points
// (CONVENTIONS.md §3). is_shared decides how completion is tracked: true
// uses the single is_checked flag (unchanged); false tracks per-person via
// packing_item_checks (one row per trip member who's checked it) rather
// than duplicating the item row per person — the matrix packing view reads
// that table directly, not owner_id, which no longer exists.
export const packingItemSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(200),
  category: z.string().trim().max(60).nullable(),
  is_document: z.boolean(),
  is_shared: z.boolean(),
  // Reminder fires via check_packing_reminders() (ROADMAP.md Milestone D) —
  // notifies every trip member if shared, or each member individually
  // (only if they personally haven't checked it) if not.
  due_date: z.string().trim().min(1).nullable(),
});

export type PackingItemInput = z.infer<typeof packingItemSchema>;
