"use client";

import Link from "next/link";
import { Card } from "@/components/ui/Card";
import type { Place } from "@/types/database.types";

interface TomorrowBannerProps {
  tripId: string;
  places: Place[];
}

function tomorrowDateString() {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

// "What's planned for tomorrow, visible to the whole team" (ROADMAP.md
// Milestone X) — reads places' own dates (Milestone W), no new
// infrastructure. The daily push notification version of this same ask was
// explicitly deferred; this banner is the only surfacing for now.
export function TomorrowBanner({ tripId, places }: TomorrowBannerProps) {
  const tomorrow = tomorrowDateString();
  const tomorrowPlaces = places.filter((place) => place.date === tomorrow);

  if (tomorrowPlaces.length === 0) return null;

  return (
    <Card elevation="md">
      <h2>Tomorrow</h2>
      <ul className="flex flex-col gap-1">
        {tomorrowPlaces.map((place) => (
          <li key={place.id}>
            <Link href={`/trips/${tripId}/places/${place.id}`}>
              {place.name}
            </Link>
          </li>
        ))}
      </ul>
    </Card>
  );
}
