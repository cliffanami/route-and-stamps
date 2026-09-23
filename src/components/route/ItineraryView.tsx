"use client";

import Link from "next/link";
import { formatPlainDate } from "@/lib/text/format-plain-date";
import type { Place, Stop } from "@/types/database.types";

interface ItineraryViewProps {
  tripId: string;
  places: Place[];
  stops: Stop[];
}

interface PlaceEntryProps {
  tripId: string;
  place: Place;
  stopName?: string;
}

// The place is the primary link (what you actually tap); the stop is
// secondary "more info" — a smaller, muted link to the stop's own page,
// not competing with the place for attention (live-usage feedback: the
// Day-by-day tab is organized by date, so the place itself is what you're
// scanning for; which stop it belongs to is context, not the headline).
function PlaceEntry({ tripId, place, stopName }: PlaceEntryProps) {
  return (
    <div className="flex flex-wrap items-baseline gap-x-2">
      <Link href={`/trips/${tripId}/places/${place.id}`}>{place.name}</Link>
      {stopName && place.nearest_stop_id && (
        <Link
          href={`/trips/${tripId}/stops/${place.nearest_stop_id}`}
          className="text-muted"
          style={{ fontSize: "13px" }}
        >
          {stopName}
        </Link>
      )}
    </div>
  );
}

// A day-by-day view derived from places' own dates (ROADMAP.md Milestone
// W) — separate from Stop Detail's free-text "Day by day" narrative
// (Milestone J's splitDayNarrative), which is unchanged and still reads a
// stop's description. This groups structured data instead.
//
// Rendered as the Route page's "Day by day" tab (ROADMAP.md live-usage
// feedback), not a conditionally-hidden bottom section anymore — always
// renders something (an empty state when there's nothing to show yet)
// since a tab going blank reads as broken, unlike a section that used to
// just not exist.
//
// Undated places still get their own "Not yet scheduled" group even
// though each one is also visible under its stop's card (collapsed by
// default) or the Unassigned section — this flat list is the only place
// every undated place is visible at a glance without expanding anything.
export function ItineraryView({ tripId, places, stops }: ItineraryViewProps) {
  const stopNameById = new Map(stops.map((stop) => [stop.id, stop.name]));

  const dated = places.filter(
    (place): place is Place & { date: string } => place.date !== null,
  );
  const undated = places.filter((place) => place.date === null);

  if (dated.length === 0 && undated.length === 0) {
    return <p className="text-muted">No places added yet.</p>;
  }

  const byDate = new Map<string, Place[]>();
  for (const place of dated) {
    const list = byDate.get(place.date) ?? [];
    list.push(place);
    byDate.set(place.date, list);
  }
  const sortedDates = Array.from(byDate.keys()).sort();

  return (
    <div className="flex flex-col gap-4">
      {sortedDates.map((date) => (
        <div key={date} className="flex flex-col gap-1">
          <h3>{formatPlainDate(date, { weekday: "short", month: "short", day: "numeric" })}</h3>
          <div className="flex flex-col gap-1">
            {byDate.get(date)!.map((place) => (
              <PlaceEntry
                key={place.id}
                tripId={tripId}
                place={place}
                stopName={place.nearest_stop_id ? stopNameById.get(place.nearest_stop_id) : undefined}
              />
            ))}
          </div>
        </div>
      ))}
      {undated.length > 0 && (
        <div className="flex flex-col gap-1">
          <h3>Not yet scheduled</h3>
          <div className="flex flex-col gap-1">
            {undated.map((place) => (
              <PlaceEntry
                key={place.id}
                tripId={tripId}
                place={place}
                stopName={place.nearest_stop_id ? stopNameById.get(place.nearest_stop_id) : undefined}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
