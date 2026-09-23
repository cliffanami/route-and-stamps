"use client";

import Link from "next/link";
import { formatPlainDate } from "@/lib/text/format-plain-date";
import type { Place } from "@/types/database.types";

interface ItineraryViewProps {
  tripId: string;
  places: Place[];
}

// A day-by-day view derived from places' own dates (ROADMAP.md Milestone
// W) — separate from Stop Detail's free-text "Day by day" narrative
// (Milestone J's splitDayNarrative), which is unchanged and still reads a
// stop's description. This groups structured data instead. Hidden entirely
// until at least one place has a date — before that, an "everything is
// unscheduled" list would just duplicate the route's existing per-stop and
// Unassigned sections with no added value.
//
// Undated places are intentionally left out, not listed under a "Not yet
// scheduled" heading — every undated place is already visible either under
// its stop's card (if nearest_stop_id is set) or in the Unassigned section
// (if not), so a bare bullet-list repeat here was pure duplication with no
// added information, just clutter at the bottom of an already-long page
// (live-usage feedback: a real trip with 24 undated-but-assigned places
// showed all 24 twice).
export function ItineraryView({ tripId, places }: ItineraryViewProps) {
  const dated = places.filter(
    (place): place is Place & { date: string } => place.date !== null,
  );
  if (dated.length === 0) return null;

  const byDate = new Map<string, Place[]>();
  for (const place of dated) {
    const list = byDate.get(place.date) ?? [];
    list.push(place);
    byDate.set(place.date, list);
  }
  const sortedDates = Array.from(byDate.keys()).sort();

  return (
    <section className="flex flex-col gap-4">
      <h2>Day by day</h2>
      {sortedDates.map((date) => (
        <div key={date} className="flex flex-col gap-1">
          <h3>{formatPlainDate(date, { weekday: "short", month: "short", day: "numeric" })}</h3>
          <ul className="flex flex-col gap-1">
            {byDate.get(date)!.map((place) => (
              <li key={place.id}>
                <Link href={`/trips/${tripId}/places/${place.id}`}>
                  {place.name}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </section>
  );
}
