import { describe, expect, it } from "vitest";
import { budgetLineSchema } from "./budget-line.schema";

function makeLine(
  overrides: Partial<Parameters<typeof budgetLineSchema.parse>[0]>,
) {
  return {
    category: "accommodation",
    description: "Hotel Gracery Shinjuku, 3 nights",
    amount_minor: 4500000,
    currency: "JPY",
    status: "not_booked" as const,
    paid_by: null,
    payment_details: null,
    due_date: null,
    place_id: null,
    stop_id: null,
    paid_at: null,
    ...overrides,
  };
}

describe("budgetLineSchema", () => {
  it("accepts a well-formed cost line", () => {
    expect(budgetLineSchema.safeParse(makeLine({})).success).toBe(true);
  });

  it("rejects a zero or negative amount", () => {
    expect(
      budgetLineSchema.safeParse(makeLine({ amount_minor: 0 })).success,
    ).toBe(false);
    expect(
      budgetLineSchema.safeParse(makeLine({ amount_minor: -100 })).success,
    ).toBe(false);
  });

  it("rejects a non-integer amount", () => {
    expect(
      budgetLineSchema.safeParse(makeLine({ amount_minor: 45.5 })).success,
    ).toBe(false);
  });

  it("upper-cases a lowercase currency code", () => {
    const result = budgetLineSchema.safeParse(makeLine({ currency: "kes" }));
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.currency).toBe("KES");
  });

  it("rejects a currency code that isn't 3 letters", () => {
    expect(
      budgetLineSchema.safeParse(makeLine({ currency: "YENN" })).success,
    ).toBe(false);
  });

  it("requires a non-empty description", () => {
    expect(
      budgetLineSchema.safeParse(makeLine({ description: "" })).success,
    ).toBe(false);
  });
});
