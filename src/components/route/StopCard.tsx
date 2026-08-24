"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { CaretDown, CaretUp } from "@phosphor-icons/react";
import { Tag } from "@/components/ui/Tag";
import { OpenInGoogleMapsLink } from "@/components/map/OpenInGoogleMapsLink";
import { StopAreaMapLoader } from "@/components/map/StopAreaMapLoader";
import { CheckInControl } from "./CheckInControl";
import type { Place, PlaceCheckin, Stop, StopCheckin } from "@/types/database.types";

interface StopCardProps {
  tripId: string;
  stop: Stop;
  places: Place[];
  consensusCount: number;
  checkins: StopCheckin[];
  placeCheckins: PlaceCheckin[];
  children: ReactNode;
}

// Not `.card` — a stop is a section of the route, not a discrete list item
// (CONVENTIONS.md §5b reserves .card for things like the PlaceRow cards
// inside it). Hierarchy comes from the type scale and whitespace instead.
//
// This is a shortcut into Stop Detail now, same relationship PlaceRow has
// to PlaceDetail — the name links there, editing lives there too (no more
// inline pencil/edit-dialog here). The caret is a separate control: it
// still expands/collapses the place list inline, since that's a genuinely
// useful quick-browse that doesn't need a full page navigation.
export function StopCard({
  tripId,
  stop,
  places,
  consensusCount,
  checkins,
  placeCheckins,
  children,
}: StopCardProps) {
  const [expanded, setExpanded] = useState(false);
  const locatedPlaces = places.filter(
    (place): place is Place & { lat: number; lng: number } =>
      place.lat !== null && place.lng !== null,
  );

  // date_label is a free-text override — shown as-is if set. Otherwise
  // fall back to the structured start_date/end_date (ROADMAP.md Milestone
  // D), which is what check_scheduled_arrivals() actually reads; showing
  // neither would leave the date silently invisible once someone's set it.
  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
  const dateDisplay =
    stop.date_label ??
    (stop.start_date
      ? stop.end_date && stop.end_date !== stop.start_date
        ? `${formatDate(stop.start_date)} – ${formatDate(stop.end_date)}`
        : formatDate(stop.start_date)
      : null);

  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-start justify-between gap-2">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <Link href={`/trips/${tripId}/stops/${stop.id}`}>
              <h2>{stop.name}</h2>
            </Link>
            <button
              type="button"
              aria-expanded={expanded}
              aria-label={expanded ? "Collapse places" : "Expand places"}
              onClick={() => setExpanded((current) => !current)}
            >
              {expanded ? (
                <CaretUp weight="duotone" size={18} />
              ) : (
                <CaretDown weight="duotone" size={18} />
              )}
            </button>
          </div>
          <span className="text-muted flex items-center gap-2">
            {places.length} place{places.length === 1 ? "" : "s"}
            {consensusCount > 0 && (
              <Tag variant="accent">{consensusCount} confirmed</Tag>
            )}
          </span>
          {dateDisplay && <p className="text-muted">{dateDisplay}</p>}
          {stop.arrival_time && (
            <p className="text-muted">
              Arriving{" "}
              {new Date(stop.arrival_time).toLocaleString("en-US", {
                month: "short",
                day: "numeric",
                hour: "numeric",
                minute: "2-digit",
              })}
            </p>
          )}
          <OpenInGoogleMapsLink lat={stop.lat} lng={stop.lng} />
          <CheckInControl
            tripId={tripId}
            stop={stop}
            checkins={checkins}
            onCheckedIn={() => setExpanded(true)}
          />
        </div>
      </div>

      {expanded && (
        <>
          {locatedPlaces.length > 0 && (
            <StopAreaMapLoader
              tripId={tripId}
              stop={stop}
              places={locatedPlaces}
              placeCheckins={placeCheckins}
            />
          )}
          <div className="flex flex-col gap-3">{children}</div>
        </>
      )}
    </section>
  );
}
