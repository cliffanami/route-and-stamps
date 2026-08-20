import { describe, expect, it } from "vitest";
import { parsePlaceMention } from "./parse-place-mention";

describe("parsePlaceMention", () => {
  it("passes a clean query through unchanged", () => {
    expect(parsePlaceMention("KICC, Nairobi, Kenya")).toEqual({
      query: "KICC, Nairobi, Kenya",
      matched: false,
    });
  });

  it("strips a 'posted a video about' prefix", () => {
    const result = parsePlaceMention(
      "posted a video about KICC Nairobi, Kenya",
    );
    expect(result.query).toBe("KICC Nairobi, Kenya");
    expect(result.matched).toBe(true);
  });

  it("strips 'check this out'", () => {
    const result = parsePlaceMention("check this out, Fushimi Inari Shrine");
    expect(result.query).toBe("Fushimi Inari Shrine");
    expect(result.matched).toBe(true);
  });

  it("strips 'you have to see' and reformats the trailing 'in <City>'", () => {
    const result = parsePlaceMention(
      "you have to see this ramen shop in Shibuya",
    );
    expect(result.query).toBe("ramen shop, Shibuya");
    expect(result.matched).toBe(true);
  });

  it("strips 'reminds me of'", () => {
    const result = parsePlaceMention("this reminds me of KICC in Nairobi");
    expect(result.query).toBe("KICC, Nairobi");
    expect(result.matched).toBe(true);
  });

  it("strips bare hashtags and emoji", () => {
    const result = parsePlaceMention(
      "Fushimi Inari Shrine 🗼 #Kyoto #MustVisit",
    );
    expect(result.query).toBe("Fushimi Inari Shrine");
    expect(result.matched).toBe(true);
  });

  it("reformats '<Name> in <City>' to '<Name>, <City>'", () => {
    const result = parsePlaceMention("Ramen Nagi in Shibuya");
    expect(result.query).toBe("Ramen Nagi, Shibuya");
    expect(result.matched).toBe(true);
  });

  it("does not reformat a lowercase 'in' clause", () => {
    const result = parsePlaceMention("cool ramen place in the market");
    expect(result.query).toBe("cool ramen place in the market");
    expect(result.matched).toBe(false);
  });

  it("falls back to the trimmed original if stripping empties the string", () => {
    const result = parsePlaceMention("check this out");
    expect(result.query).toBe("check this out");
  });
});
