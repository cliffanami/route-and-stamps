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
