import { describe, expect, it } from "vitest";
import { splitDayNarrative } from "./split-day-narrative";

describe("splitDayNarrative", () => {
  it("splits into one chunk per 'Day N —' paragraph", () => {
    const text =
      "Day 1 — Mon 26 Oct — Tokyo (arrival). Arrival day.\n\nDay 2 — Tue 27 Oct — Tokyo (cycling). Cycling day.";
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
    const result = splitDayNarrative("Day 1 — one.\n\n   Day 2 — two.   ");
    expect(result[0]).toBe("Day 1 — one.");
    expect(result[1]).toBe("Day 2 — two.");
  });

  it("does not split mid-paragraph, so a Day marker inline with prior text stays attached", () => {
    // No blank line before "Day 2" — a single continuous paragraph is never
    // split mid-way, since that's exactly what could orphan a markdown
    // emphasis marker (see the file-level comment).
    const text = "Day 1 — one. Day 2 — two, still in the same paragraph.";
    const result = splitDayNarrative(text);
    expect(result).toEqual([text]);
  });

  it("splits cleanly when each Day heading is bolded, never orphaning a '**'", () => {
    const text =
      "**Day 1 — Kyoto**\n\nWe visited the temple.\n\n**Day 2 — Osaka**\n\nWe visited the castle.";
    const result = splitDayNarrative(text);
    expect(result).toHaveLength(2);
    expect(result[0]).toBe("**Day 1 — Kyoto**\n\nWe visited the temple.");
    expect(result[1]).toBe("**Day 2 — Osaka**\n\nWe visited the castle.");
    // every "**" is paired within its own chunk
    for (const chunk of result) {
      expect((chunk.match(/\*\*/g) ?? []).length % 2).toBe(0);
    }
  });
});
