"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { segment: "route", label: "Route" },
  { segment: "map", label: "Map" },
  { segment: "add", label: "Add" },
  { segment: "tips", label: "Tips" },
  { segment: "budget", label: "Budget" },
  { segment: "packing", label: "Packing" },
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

        return (
          <Link key={tab.segment} href={href} aria-current={isActive ? "page" : undefined}>
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
