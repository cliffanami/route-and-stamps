import { describe, expect, it } from "vitest";
import { tripLogisticsSchema } from "./trip-logistics.schema";

describe("tripLogisticsSchema", () => {
  it("accepts luggage_forwarding_enabled true", () => {
    const result = tripLogisticsSchema.safeParse({ luggage_forwarding_enabled: true });
    expect(result.success).toBe(true);
  });

  it("accepts luggage_forwarding_enabled false", () => {
    const result = tripLogisticsSchema.safeParse({ luggage_forwarding_enabled: false });
    expect(result.success).toBe(true);
  });

  it("rejects a non-boolean value", () => {
    const result = tripLogisticsSchema.safeParse({ luggage_forwarding_enabled: "yes" });
    expect(result.success).toBe(false);
  });
});
