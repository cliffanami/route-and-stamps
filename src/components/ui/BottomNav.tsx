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
    <nav className="nav fixed inset-x-0 bottom-0 justify-around border-t border-[var(--color-divider)] bg-[var(--color-bg)]">
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
