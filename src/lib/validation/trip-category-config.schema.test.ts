import { describe, expect, it } from "vitest";
import { tripCategoryConfigSchema } from "./trip-category-config.schema";

function makeInput(overrides: Partial<Parameters<typeof tripCategoryConfigSchema.parse>[0]>) {
  return {
    currencies: ["JPY", "KES"],
    tip_categories: ["Food", "Culture"],
    budget_categories: ["flights", "accommodation"],
    ...overrides,
  };
}

describe("tripCategoryConfigSchema", () => {
  it("accepts valid lists", () => {
    const result = tripCategoryConfigSchema.safeParse(makeInput({}));
    expect(result.success).toBe(true);
  });

  it("accepts empty lists", () => {
    const result = tripCategoryConfigSchema.safeParse(
      makeInput({ currencies: [], tip_categories: [], budget_categories: [] }),
    );
    expect(result.success).toBe(true);
  });

  it("uppercases lowercase currency codes", () => {
    const result = tripCategoryConfigSchema.parse(makeInput({ currencies: ["jpy"] }));
    expect(result.currencies).toEqual(["JPY"]);
  });

  it("rejects a currency code that isn't 3 letters", () => {
    const result = tripCategoryConfigSchema.safeParse(makeInput({ currencies: ["YEN", "K"] }));
    expect(result.success).toBe(false);
  });

  it("rejects an empty category name", () => {
    const result = tripCategoryConfigSchema.safeParse(makeInput({ tip_categories: [""] }));
    expect(result.success).toBe(false);
  });
});
