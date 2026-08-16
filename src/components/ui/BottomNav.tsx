"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Path,
  MapTrifold,
  PlusCircle,
  Lightbulb,
  Wallet,
  SuitcaseRolling,
} from "@phosphor-icons/react";

const TABS = [
  { segment: "route", label: "Route", icon: Path },
  { segment: "map", label: "Map", icon: MapTrifold },
  { segment: "add", label: "Add", icon: PlusCircle },
  { segment: "tips", label: "Tips", icon: Lightbulb },
  { segment: "budget", label: "Budget", icon: Wallet },
  { segment: "packing", label: "Packing", icon: SuitcaseRolling },
] as const;

interface BottomNavProps {
  tripId: string;
}

export function BottomNav({ tripId }: BottomNavProps) {
  const pathname = usePathname();

  return (
    <nav
      className="nav fixed inset-x-0 bottom-0 justify-around bg-[var(--color-bg)]"
      style={{
        // Broadsheet separates structure with whitespace/elevation, not
        // rules (broadsheet-guide.md "Don't") — this reuses --shadow-sm's
        // own color-mix rather than a divider line, just cast upward since
        // the token set has no bottom-anchored-bar variant to draw from.
        boxShadow: "0 -1px 2px color-mix(in srgb, var(--color-neutral-900) 14%, transparent)",
        // Leaflet's map (Map page only) pans/zooms its own GPU-composited
        // layers, which triggers a known Chromium compositing bug: a
        // sibling position:fixed element's SVG icons stop painting even
        // though every computed style reports them as visible (confirmed
        // via direct DOM inspection — not a CSS override, and not
        // transient). BottomNav had no explicit stacking order at all;
        // isolating it into its own stacking context with a z-index above
        // Leaflet's own pane scale (max 1000) keeps its paint independent
        // of the map's repaints.
        isolation: "isolate",
        zIndex: 1000,
      }}
    >
      {TABS.map((tab) => {
        const href = `/trips/${tripId}/${tab.segment}`;
        const isActive = pathname === href;
        const Icon = tab.icon;

        return (
          <Link
            key={tab.segment}
            href={href}
            aria-current={isActive ? "page" : undefined}
            className="flex flex-col items-center gap-1"
          >
            <Icon weight="duotone" size={22} />
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
