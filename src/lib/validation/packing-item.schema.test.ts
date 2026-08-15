import { describe, expect, it } from "vitest";
import { packingItemSchema } from "./packing-item.schema";

function makeItem(
  overrides: Partial<Parameters<typeof packingItemSchema.parse>[0]>,
) {
  return {
    name: "Passport",
    category: "Documents",
    is_document: true,
    owner_id: null,
    ...overrides,
  };
}

describe("packingItemSchema", () => {
  it("accepts a shared item (owner_id null)", () => {
    expect(packingItemSchema.safeParse(makeItem({})).success).toBe(true);
  });

  it("accepts a personal item (owner_id set)", () => {
    const result = packingItemSchema.safeParse(
      makeItem({ owner_id: "11111111-1111-1111-1111-111111111111" }),
    );
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
});
