import { z } from "zod";

// Enforced at one point today — TipForm.tsx uses plain useState, not a
// React Hook Form resolver, so this only runs via the Supabase mutation
// (parse before insert), not the "two enforcement points" CONVENTIONS.md
// §3 asks for. category is free-form, not an enum, matching the schema.sql
// column comment (PRD §6.4). embed_html is set programmatically from the
// oEmbed fetch, not typed directly, but still validated pre-insert.
export const tipSchema = z
  .object({
    category: z.string().trim().min(1, "Category is required").max(60),
    format: z.enum(["text", "video"]),
    // Optional, applies to either format — content_text/video_caption stay
    // the body, this is just a scannable heading above them (ROADMAP.md
    // Milestone R).
    title: z.string().trim().max(100).nullable(),
    content_text: z.string().trim().max(2000).nullable(),
    source_url: z.string().trim().url("Must be a valid URL").nullable(),
    embed_html: z.string().nullable(),
    // Video-only, optional — a "why I saved this" note alongside the link,
    // the same role content_text plays for a text tip (ROADMAP.md
    // Milestone P).
    video_caption: z.string().trim().max(500).nullable(),
    // Free-text, additive — not category (category is the existing strict
    // single-select; a tip can carry more than one tag).
    tags: z.array(z.string().trim().min(1).max(40)).max(10).default([]),
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
