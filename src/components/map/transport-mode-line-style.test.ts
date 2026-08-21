import { describe, expect, it } from "vitest";
import {
  NEUTRAL_LINE_STYLE,
  leafletDashArray,
  transportModeLineStyle,
} from "./transport-mode-line-style";

describe("transportModeLineStyle", () => {
  const modes = ["train", "bus", "flight"];

  it("assigns a style positionally by index in the trip's configured modes", () => {
    const train = transportModeLineStyle("train", modes);
    const bus = transportModeLineStyle("bus", modes);
    expect(train).not.toEqual(bus);
  });

  it("returns the same style for the same mode every time", () => {
    expect(transportModeLineStyle("train", modes)).toEqual(
      transportModeLineStyle("train", modes),
    );
  });

  it("falls back to neutral for a null mode", () => {
    expect(transportModeLineStyle(null, modes)).toEqual(NEUTRAL_LINE_STYLE);
  });

  it("falls back to neutral for a mode not in the trip's list", () => {
    expect(transportModeLineStyle("teleporter", modes)).toEqual(
      NEUTRAL_LINE_STYLE,
    );
  });

  it("wraps back to the start of the palette past 8 modes", () => {
    const manyModes = Array.from({ length: 9 }, (_, i) => `mode-${i}`);
    expect(transportModeLineStyle("mode-0", manyModes)).toEqual(
      transportModeLineStyle("mode-8", manyModes),
    );
  });
});

describe("leafletDashArray", () => {
  it("returns undefined for solid", () => {
    expect(leafletDashArray("solid")).toBeUndefined();
  });

  it("returns a dash pattern string for dashed and dotted", () => {
    expect(leafletDashArray("dashed")).toBe("12 8");
    expect(leafletDashArray("dotted")).toBe("2 6");
  });
});
