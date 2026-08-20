import { describe, expect, it } from "vitest";
import { tripDetailsSchema } from "./trip-details.schema";

function makeInput(overrides: Partial<Parameters<typeof tripDetailsSchema.parse>[0]>) {
  return {
    name: "Japan 2026",
    description: null,
    start_date: null,
    end_date: null,
    ...overrides,
  };
}

describe("tripDetailsSchema", () => {
  it("accepts a name-only trip with no description or dates", () => {
    const result = tripDetailsSchema.safeParse(makeInput({}));
    expect(result.success).toBe(true);
  });

  it("rejects an empty name", () => {
    const result = tripDetailsSchema.safeParse(makeInput({ name: "" }));
    expect(result.success).toBe(false);
  });

  it("rejects a name that's just whitespace", () => {
    const result = tripDetailsSchema.safeParse(makeInput({ name: "   " }));
    expect(result.success).toBe(false);
  });

  it("accepts a description and date range", () => {
    const result = tripDetailsSchema.safeParse(
      makeInput({
        description: "Two weeks across Honshu.",
        start_date: "2026-03-01",
        end_date: "2026-03-15",
      }),
    );
    expect(result.success).toBe(true);
  });

  it("rejects a description over 2000 characters", () => {
    const result = tripDetailsSchema.safeParse(
      makeInput({ description: "a".repeat(2001) }),
    );
    expect(result.success).toBe(false);
  });
});
