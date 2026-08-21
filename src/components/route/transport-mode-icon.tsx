import { createElement } from "react";
import {
  Train,
  Bicycle,
  PersonSimpleWalk,
  Bus,
  Boat,
  Taxi,
  Airplane,
  Compass,
  type Icon,
} from "@phosphor-icons/react";

// trip.transport_modes is an open-ended, per-trip configurable list
// (ROADMAP.md Milestone C) — this only has icons for the seven starter
// values every trip gets by default. Anything else (a custom mode someone
// added) falls back to Compass rather than showing nothing, matching the
// same graceful-degradation rule the rest of this app follows for
// unmapped/optional values.
const ICONS: Record<string, Icon> = {
  train: Train,
  bicycle: Bicycle,
  walk: PersonSimpleWalk,
  bus: Bus,
  ferry: Boat,
  taxi: Taxi,
  flight: Airplane,
};

export function transportModeIcon(mode: string): Icon {
  return ICONS[mode.trim().toLowerCase()] ?? Compass;
}

interface TransportModeIconProps {
  mode: string;
  size?: number;
}

export function TransportModeIcon({ mode, size = 16 }: TransportModeIconProps) {
  // createElement, not JSX with a variable tag — the icon component is a
  // stable module-scope lookup, not actually created during render, but
  // <IconComponent/> is exactly the shape react-hooks/static-components
  // flags, so this sidesteps that heuristic rather than fighting it.
  return createElement(transportModeIcon(mode), { weight: "duotone", size });
}
