import { z } from "zod";

// ROADMAP.md Milestone G — one JSON Schema + one Zod schema per write
// action the chat assistant can propose. The JSON Schema goes to Claude's
// `tools` param; the Zod schema validates whatever Claude sends back
// before the client ever renders a confirm card from it — an AI's tool
// call is untrusted input, same as a form submission.

export const CHAT_TOOLS = [
  {
    name: "add_place",
    description:
      "Propose adding a new place to the trip. Use when the user describes a specific place they want to visit or save.",
    input_schema: {
      type: "object" as const,
      properties: {
        name: { type: "string", description: "The place's name" },
        location_hint: {
          type: "string",
          description:
            "City, region, and/or country to help find the right location — empty string if not mentioned",
        },
      },
      required: ["name", "location_hint"],
      additionalProperties: false,
    },
  },
  {
    name: "add_tip",
    description:
      "Propose adding a tip or piece of advice to the trip. Use when the user shares advice, a recommendation, or a note worth remembering.",
    input_schema: {
      type: "object" as const,
      properties: {
        category: { type: "string", description: "A short category label, e.g. Food, Transport" },
        content_text: { type: "string", description: "The tip's full text" },
        related_place_name: {
          type: "string",
          description: "Name of an existing trip place this tip is about, if any — empty string if none",
        },
        related_stop_name: {
          type: "string",
          description: "Name of an existing trip stop this tip is about, if any — empty string if none",
        },
      },
      required: ["category", "content_text", "related_place_name", "related_stop_name"],
      additionalProperties: false,
    },
  },
  {
    name: "cast_vote",
    description:
      "Propose casting or changing the requesting user's own vote on an existing place. Use when the user states how interested they are in a place already on the trip.",
    input_schema: {
      type: "object" as const,
      properties: {
        place_name: { type: "string", description: "Name of an existing trip place" },
        level: {
          type: "string",
          enum: ["interested", "want", "really_want", "must_go", "skip"],
        },
      },
      required: ["place_name", "level"],
      additionalProperties: false,
    },
  },
  {
    name: "log_budget_line",
    description:
      "Propose logging a cost to the trip's budget. Use when the user mentions spending money or a cost they want tracked.",
    input_schema: {
      type: "object" as const,
      properties: {
        description: { type: "string", description: "What the cost is for" },
        amount: { type: "string", description: "The amount, as a plain decimal number string" },
        currency: { type: "string", description: "3-letter currency code, e.g. JPY" },
        category: { type: "string", description: "A short category label, e.g. Transport, Food" },
        related_stop_name: {
          type: "string",
          description: "Name of an existing trip stop this cost is for, if any — empty string if none",
        },
      },
      required: ["description", "amount", "currency", "category", "related_stop_name"],
      additionalProperties: false,
    },
  },
] as const;

export const addPlaceToolInputSchema = z.object({
  name: z.string().trim().min(1).max(200),
  location_hint: z.string().trim().max(200),
});

export const addTipToolInputSchema = z.object({
  category: z.string().trim().min(1).max(60),
  content_text: z.string().trim().min(1).max(2000),
  related_place_name: z.string().trim().max(200),
  related_stop_name: z.string().trim().max(200),
});

export const castVoteToolInputSchema = z.object({
  place_name: z.string().trim().min(1).max(200),
  level: z.enum(["interested", "want", "really_want", "must_go", "skip"]),
});

export const logBudgetLineToolInputSchema = z.object({
  description: z.string().trim().min(1).max(500),
  amount: z.string().trim().min(1),
  currency: z.string().trim().toUpperCase().length(3),
  category: z.string().trim().min(1).max(60),
  related_stop_name: z.string().trim().max(200),
});

export type AddPlaceToolInput = z.infer<typeof addPlaceToolInputSchema>;
export type AddTipToolInput = z.infer<typeof addTipToolInputSchema>;
export type CastVoteToolInput = z.infer<typeof castVoteToolInputSchema>;
export type LogBudgetLineToolInput = z.infer<typeof logBudgetLineToolInputSchema>;

export type ChatToolName = (typeof CHAT_TOOLS)[number]["name"];
