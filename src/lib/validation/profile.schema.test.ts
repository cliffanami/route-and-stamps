import { describe, expect, it } from "vitest";
import { profileSchema } from "./profile.schema";

describe("profileSchema", () => {
  it("accepts a real display name", () => {
    const result = profileSchema.safeParse({ display_name: "Cliff" });
    expect(result.success).toBe(true);
  });

  it("rejects an empty display name", () => {
    const result = profileSchema.safeParse({ display_name: "" });
    expect(result.success).toBe(false);
  });

  it("rejects a display name that's just whitespace", () => {
    const result = profileSchema.safeParse({ display_name: "   " });
    expect(result.success).toBe(false);
  });

  it("rejects a display name over 100 characters", () => {
    const result = profileSchema.safeParse({ display_name: "a".repeat(101) });
    expect(result.success).toBe(false);
  });
});
