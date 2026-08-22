import { describe, expect, it } from "vitest";
import {
  addPlaceToolInputSchema,
  addTipToolInputSchema,
  castVoteToolInputSchema,
  logBudgetLineToolInputSchema,
} from "./chat-tools";

describe("addPlaceToolInputSchema", () => {
  it("accepts a name with an empty location_hint", () => {
    const result = addPlaceToolInputSchema.safeParse({ name: "Fushimi Inari", location_hint: "" });
    expect(result.success).toBe(true);
  });

  it("rejects a missing name", () => {
    const result = addPlaceToolInputSchema.safeParse({ name: "", location_hint: "Kyoto" });
    expect(result.success).toBe(false);
  });
});

describe("addTipToolInputSchema", () => {
  it("accepts a tip with no place/stop link", () => {
    const result = addTipToolInputSchema.safeParse({
      category: "Food",
      content_text: "Try the matcha soft serve.",
      related_place_name: "",
      related_stop_name: "",
    });
    expect(result.success).toBe(true);
  });

  it("rejects empty content", () => {
    const result = addTipToolInputSchema.safeParse({
      category: "Food",
      content_text: "",
      related_place_name: "",
      related_stop_name: "",
    });
    expect(result.success).toBe(false);
  });
});

describe("castVoteToolInputSchema", () => {
  it("accepts a valid vote level", () => {
    const result = castVoteToolInputSchema.safeParse({ place_name: "Kyoto Tower", level: "must_go" });
    expect(result.success).toBe(true);
  });

  it("rejects an invalid vote level", () => {
    const result = castVoteToolInputSchema.safeParse({ place_name: "Kyoto Tower", level: "love_it" });
    expect(result.success).toBe(false);
  });
});

describe("logBudgetLineToolInputSchema", () => {
  it("accepts a valid cost entry and uppercases the currency", () => {
    const result = logBudgetLineToolInputSchema.safeParse({
      description: "Shinkansen tickets",
      amount: "25000",
      currency: "jpy",
      category: "Transport",
      related_stop_name: "Kyoto",
    });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.currency).toBe("JPY");
  });

  it("rejects a currency that isn't 3 letters", () => {
    const result = logBudgetLineToolInputSchema.safeParse({
      description: "Shinkansen tickets",
      amount: "25000",
      currency: "dollars",
      category: "Transport",
      related_stop_name: "",
    });
    expect(result.success).toBe(false);
  });
});
