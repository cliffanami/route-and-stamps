import { describe, expect, it } from "vitest";
import { minorUnitExponent, formatMinor, toMinorUnits } from "./currency";

describe("minorUnitExponent", () => {
  it("is 0 for JPY (no decimal places)", () => {
    expect(minorUnitExponent("JPY")).toBe(0);
  });

  it("is 2 for KES and USD", () => {
    expect(minorUnitExponent("KES")).toBe(2);
    expect(minorUnitExponent("USD")).toBe(2);
  });

  it("falls back to 2 for an unrecognized code", () => {
    expect(minorUnitExponent("NOTREAL")).toBe(2);
  });
});

describe("formatMinor", () => {
  it("does not treat JPY minor units as cents", () => {
    // 4500 JPY minor units = ¥4,500, not ¥45.00 — the bug this whole
    // module exists to prevent.
    expect(formatMinor(4500, "JPY")).toBe("¥4,500");
  });

  it("formats KES with two decimal places", () => {
    expect(formatMinor(123456, "KES")).toContain("1,234.56");
  });
});

describe("toMinorUnits", () => {
  it("converts a JPY amount 1:1 (no cents to scale by)", () => {
    expect(toMinorUnits("4500", "JPY")).toBe(4500);
  });

  it("converts a KES decimal amount to minor units", () => {
    expect(toMinorUnits("1234.56", "KES")).toBe(123456);
  });

  it("round-trips through formatMinor/toMinorUnits without drift", () => {
    const originalMinor = 987654;
    const formatted = new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "KES",
      currencyDisplay: "code",
    })
      .format(originalMinor / 100)
      .replace(/[^0-9.]/g, "");
    expect(toMinorUnits(formatted, "KES")).toBe(originalMinor);
  });
});
