// Positional (color, dash-pattern) palette for the route map's colored
// transport-mode line (ROADMAP.md Milestone C). Modes are an open-ended,
// per-trip configurable list (trips.transport_modes), not a fixed named
// set, so a mode can't be looked up by name the way vote levels or
// transport-mode icons are — it's assigned by index in the trip's own
// list instead, from a fixed palette built entirely out of Broadsheet's
// existing cyan/magenta accent ramps (no new colors invented, same
// constraint the vote-scale mapping in ARCHITECTURE.md §1b already solved
// for "not enough accent hues").
export type DashStyle = "solid" | "dashed" | "dotted";

export interface ModeLineStyle {
  color: string;
  dashStyle: DashStyle;
}

const PALETTE: ModeLineStyle[] = [
  { color: "#006786", dashStyle: "solid" }, // --color-accent-700
  { color: "#aa0b56", dashStyle: "solid" }, // --color-accent-2-700
  { color: "#38a6cf", dashStyle: "dashed" }, // --color-accent-500
  { color: "#ff458e", dashStyle: "dashed" }, // --color-accent-2-500
  { color: "#99e0ff", dashStyle: "dotted" }, // --color-accent-300
  { color: "#ffc0d0", dashStyle: "dotted" }, // --color-accent-2-300
  { color: "#0a303e", dashStyle: "dashed" }, // --color-accent-900
  { color: "#4b1528", dashStyle: "dotted" }, // --color-accent-2-900
];

// A 9th+ configured mode wraps back to slot 1 rather than growing the
// palette — accepted limitation, unrealistic for a two-person trip's
// actual mode count.
export const NEUTRAL_LINE_STYLE: ModeLineStyle = {
  color: "#bab6b6", // --color-neutral-400
  dashStyle: "solid",
};

// A stop with no transport_mode set still renders a visible segment —
// never a gap — as neutral gray.
export function transportModeLineStyle(
  mode: string | null,
  transportModes: string[],
): ModeLineStyle {
  if (!mode) return NEUTRAL_LINE_STYLE;
  const index = transportModes.indexOf(mode);
  if (index === -1) return NEUTRAL_LINE_STYLE;
  return PALETTE[index % PALETTE.length];
}

const LEAFLET_DASH_ARRAY: Record<DashStyle, string | undefined> = {
  solid: undefined,
  dashed: "12 8",
  dotted: "2 6",
};

export function leafletDashArray(dashStyle: DashStyle): string | undefined {
  return LEAFLET_DASH_ARRAY[dashStyle];
}
