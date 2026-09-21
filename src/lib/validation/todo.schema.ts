import { z } from "zod";

// Enforced at one point today, same posture as tip.schema.ts — TodoForm uses
// plain useState, not an RHF resolver, so this only runs via the Supabase
// mutation. related_place_id and phase are independent optional tags,
// neither required (ROADMAP.md Milestone AE) — a todo doesn't have to be
// tied to anything.
export const todoSchema = z.object({
  text: z.string().trim().min(1, "Text is required").max(500),
  due_date: z.string().nullable(),
  related_place_id: z.string().uuid().nullable(),
  phase: z.enum(["pre_trip", "during_trip", "post_trip"]).nullable(),
});

export type TodoInput = z.infer<typeof todoSchema>;
