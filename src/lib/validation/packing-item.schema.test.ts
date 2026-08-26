import { describe, expect, it } from "vitest";
import { packingItemSchema } from "./packing-item.schema";

function makeItem(
  overrides: Partial<Parameters<typeof packingItemSchema.parse>[0]>,
) {
  return {
    name: "Passport",
    category: "Documents",
    description: null,
    is_document: true,
    is_shared: true,
    due_date: null,
    ...overrides,
  };
}

describe("packingItemSchema", () => {
  it("accepts a shared item", () => {
    expect(packingItemSchema.safeParse(makeItem({})).success).toBe(true);
  });

  it("accepts a non-shared (per-person) item", () => {
    const result = packingItemSchema.safeParse(makeItem({ is_shared: false }));
    expect(result.success).toBe(true);
  });

  it("rejects an empty name", () => {
    expect(packingItemSchema.safeParse(makeItem({ name: "" })).success).toBe(
      false,
    );
  });

  it("allows a null category", () => {
    expect(
      packingItemSchema.safeParse(makeItem({ category: null })).success,
    ).toBe(true);
  });

  it("allows an optional description", () => {
    expect(
      packingItemSchema.safeParse(makeItem({ description: "Buy at the airport" }))
        .success,
    ).toBe(true);
  });

  it("allows a null description", () => {
    expect(
      packingItemSchema.safeParse(makeItem({ description: null })).success,
    ).toBe(true);
  });
});
