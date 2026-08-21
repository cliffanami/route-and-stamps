import { describe, expect, it } from "vitest";
import { splitDayNarrative } from "./split-day-narrative";

describe("splitDayNarrative", () => {
  it("splits into one chunk per 'Day N —' occurrence", () => {
    const text =
      "Day 1 — Mon 26 Oct — Tokyo (arrival). Arrival day. Day 2 — Tue 27 Oct — Tokyo (cycling). Cycling day.";
    const result = splitDayNarrative(text);
    expect(result).toHaveLength(2);
    expect(result[0]).toMatch(/^Day 1/);
    expect(result[1]).toMatch(/^Day 2/);
  });

  it("returns the whole text as one chunk when there's no Day pattern", () => {
    const result = splitDayNarrative("Just a plain note with no day markers.");
    expect(result).toEqual(["Just a plain note with no day markers."]);
  });

  it("handles an empty string without throwing", () => {
    expect(splitDayNarrative("")).toEqual([]);
  });

  it("trims whitespace from each chunk", () => {
    const result = splitDayNarrative("Day 1 — one.   Day 2 — two.");
    expect(result[0]).toBe("Day 1 — one.");
    expect(result[1]).toBe("Day 2 — two.");
  });
});
