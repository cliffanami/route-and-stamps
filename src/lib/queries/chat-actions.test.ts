import { describe, expect, it } from "vitest";
import { resolveIdByName } from "./chat-actions";

describe("resolveIdByName", () => {
  const items = [
    { id: "1", name: "Fushimi Inari Shrine" },
    { id: "2", name: "Kyoto" },
    { id: "3", name: "Nishiki Market" },
  ];

  it("matches an exact name, case-insensitively", () => {
    expect(resolveIdByName("kyoto", items)).toBe("2");
  });

  it("matches when the query is a substring of an item's name", () => {
    expect(resolveIdByName("Fushimi Inari", items)).toBe("1");
  });

  it("matches when an item's name is a substring of the query", () => {
    expect(resolveIdByName("Nishiki Market food stalls", items)).toBe("3");
  });

  it("returns null for an empty name", () => {
    expect(resolveIdByName("", items)).toBeNull();
    expect(resolveIdByName("   ", items)).toBeNull();
  });

  it("returns null when nothing matches", () => {
    expect(resolveIdByName("Tokyo Tower", items)).toBeNull();
  });
});
