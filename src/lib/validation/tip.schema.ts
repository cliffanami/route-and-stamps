import { z } from "zod";

// Shared by TipForm (React Hook Form resolver) and the Supabase insert
// (parse before insert) — one schema, two enforcement points
// (CONVENTIONS.md §3). category is free-form, not an enum, matching the
// schema.sql column comment (PRD §6.4). embed_html is set programmatically
// from the oEmbed fetch, not typed directly, but still validated pre-insert.
export const tipSchema = z
  .object({
    category: z.string().trim().min(1, "Category is required").max(60),
    format: z.enum(["text", "video"]),
    content_text: z.string().trim().max(2000).nullable(),
    source_url: z.string().trim().url("Must be a valid URL").nullable(),
    embed_html: z.string().nullable(),
    related_place_id: z.string().uuid().nullable(),
    // Independent of related_place_id (ROADMAP.md Milestone B) — either,
    // both, or neither can be set. A tip doesn't have to be tied to
    // anything, and town-level advice isn't always about one specific place.
    related_stop_id: z.string().uuid().nullable(),
  })
  .refine((tip) => tip.format !== "text" || !!tip.content_text, {
    message: "Text tips need content",
    path: ["content_text"],
  })
  .refine((tip) => tip.format !== "video" || !!tip.source_url, {
    message: "Video tips need a link",
    path: ["source_url"],
  });

export type TipInput = z.infer<typeof tipSchema>;
