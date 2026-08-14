import { describe, expect, it } from "vitest";
import { haversineKm } from "./haversine";

describe("haversineKm", () => {
  it("returns 0 for identical coordinates", () => {
    expect(haversineKm(35.6812, 139.7671, 35.6812, 139.7671)).toBe(0);
  });

  it("matches the known distance between Tokyo and Kyoto (~370km)", () => {
    const distance = haversineKm(35.6812, 139.7671, 35.0116, 135.7681);
    expect(distance).toBeGreaterThan(360);
    expect(distance).toBeLessThan(380);
  });

  it("is symmetric", () => {
    const a = haversineKm(35.6812, 139.7671, 34.3978, 132.4753);
    const b = haversineKm(34.3978, 132.4753, 35.6812, 139.7671);
    expect(a).toBeCloseTo(b, 10);
  });
});
