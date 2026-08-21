import { describe, expect, it } from "vitest";
import { funFactSchema } from "./fun-fact.schema";

describe("funFactSchema", () => {
  it("accepts a bare fact with no place/stop link", () => {
    const result = funFactSchema.safeParse({
      body: "Kyoto was the capital of Japan for over a thousand years.",
      place_id: null,
      stop_id: null,
    });
    expect(result.success).toBe(true);
  });

  it("accepts a fact linked to both a place and a stop", () => {
    const result = funFactSchema.safeParse({
      body: "This shrine has over 10,000 torii gates.",
      place_id: "11111111-1111-1111-1111-111111111111",
      stop_id: "22222222-2222-2222-2222-222222222222",
    });
    expect(result.success).toBe(true);
  });

  it("rejects an empty body", () => {
    const result = funFactSchema.safeParse({
      body: "   ",
      place_id: null,
      stop_id: null,
    });
    expect(result.success).toBe(false);
  });

  it("rejects a body over 2000 characters", () => {
    const result = funFactSchema.safeParse({
      body: "a".repeat(2001),
      place_id: null,
      stop_id: null,
    });
    expect(result.success).toBe(false);
  });

  it("rejects a non-uuid place_id", () => {
    const result = funFactSchema.safeParse({
      body: "A fact",
      place_id: "not-a-uuid",
      stop_id: null,
    });
    expect(result.success).toBe(false);
  });
});
