import { z } from "zod";

// Display name — the one profile field Milestone A actually makes
// editable. Avatar/notification style are shown/deferred, not wired to a
// mutation yet (no upload flow, no notification-preference column in
// schema.sql today).
export const profileSchema = z.object({
  display_name: z.string().trim().min(1, "Name is required").max(100),
});

export type ProfileInput = z.infer<typeof profileSchema>;
