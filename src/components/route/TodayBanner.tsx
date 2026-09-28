"use client";

import Link from "next/link";
import { Card } from "@/components/ui/Card";
import type { Stop } from "@/types/database.types";

interface TodayBannerProps {
  tripId: string;
  stops: Stop[];
}

function todayIso(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

// "Where you are today" (ROADMAP.md live-usage feedback) — date-range
// derived (stop.start_date <= today <= stop.end_date), the same passive,
// no-action-required logic TomorrowBanner/TripCountdown already use, not
// the separate checkin-based currentStopFromCheckins() the Map page uses
// for its own zoom decision. Plain string comparison, not parsePlainDate —
// "YYYY-MM-DD" strings sort lexicographically the same as their dates, and
// no arithmetic is happening here, just a range check.
export function TodayBanner({ tripId, stops }: TodayBannerProps) {
  const today = todayIso();
  const currentStop = stops.find(
    (stop) =>
      stop.start_date !== null &&
      stop.start_date <= today &&
      (stop.end_date ?? stop.start_date) >= today,
  );

  if (!currentStop) return null;

  return (
    <Card elevation="md">
      <h2>Today</h2>
      <p>
        You&rsquo;re in{" "}
        <Link href={`/trips/${tripId}/stops/${currentStop.id}`}>
          {currentStop.name}
        </Link>
      </p>
    </Card>
  );
}
