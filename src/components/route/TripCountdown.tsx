"use client";

import { Card } from "@/components/ui/Card";
import { parsePlainDate } from "@/lib/text/format-plain-date";
import type { Trip } from "@/types/database.types";

interface TripCountdownProps {
  trip: Trip;
}

const MS_PER_DAY = 24 * 60 * 60 * 1000;
const DATE_FORMAT: Intl.DateTimeFormatOptions = {
  weekday: "short",
  month: "short",
  day: "numeric",
};

function startOfToday(): Date {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return now;
}

// trips.start_date is nullable — same "render nothing" handling
// TomorrowBanner already uses for its own missing-data case, not a broken
// countdown (ROADMAP.md Milestone AD).
export function TripCountdown({ trip }: TripCountdownProps) {
  if (!trip.start_date) return null;

  const today = startOfToday();
  const start = parsePlainDate(trip.start_date);
  const end = trip.end_date ? parsePlainDate(trip.end_date) : start;

  const daysUntilStart = Math.round((start.getTime() - today.getTime()) / MS_PER_DAY);

  if (daysUntilStart > 0) {
    return (
      <Card elevation="md">
        <p>
          {daysUntilStart} day{daysUntilStart === 1 ? "" : "s"} until your trip
          {" — "}
          starts {start.toLocaleDateString("en-US", DATE_FORMAT)}
        </p>
      </Card>
    );
  }

  if (today <= end) {
    const dayNumber = Math.round((today.getTime() - start.getTime()) / MS_PER_DAY) + 1;
    return (
      <Card elevation="md">
        <p>
          Day {dayNumber} of your trip
          {" — "}
          {today.toLocaleDateString("en-US", DATE_FORMAT)}
        </p>
      </Card>
    );
  }

  // Trip has ended — no wrap-up state for now (ROADMAP.md Milestone AD).
  return null;
}
