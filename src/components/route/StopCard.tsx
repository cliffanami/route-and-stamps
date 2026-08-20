"use client";

import { useState, type ReactNode } from "react";
import { PencilSimple, CaretDown, CaretUp } from "@phosphor-icons/react";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { Tag } from "@/components/ui/Tag";
import { StopLogisticsForm } from "./StopLogisticsForm";
import { OpenInGoogleMapsLink } from "@/components/map/OpenInGoogleMapsLink";
import { StopAreaMapLoader } from "@/components/map/StopAreaMapLoader";
import type { Place, Stop } from "@/types/database.types";

interface StopCardProps {
  tripId: string;
  stop: Stop;
  places: Place[];
  consensusCount: number;
  children: ReactNode;
}

const LOGISTICS_FIELDS = [
  { key: "hotel_info", label: "Hotel" },
  { key: "guide_info", label: "Guide" },
  { key: "flight_info", label: "Flight" },
] as const;

// Not `.card` — a stop is a section of the route, not a discrete list item
// (CONVENTIONS.md §5b reserves .card for things like the PlaceRow cards
// inside it). Hierarchy comes from the type scale and whitespace instead.
//
// The place list is a collapsible summary (closed by default) — clicking
// the stop name/summary is "the route item is clickable" and reveals both
// the place cards and a small map of the stop's area, in one interaction.
export function StopCard({
  tripId,
  stop,
  places,
  consensusCount,
  children,
}: StopCardProps) {
  const [editing, setEditing] = useState(false);
  const [expanded, setExpanded] = useState(false);
  // Loose check, not `!== null` — if 0003_budget_logistics.sql hasn't run
  // yet on a given environment, these columns are absent from the row
  // entirely (undefined), not null, and a strict check let that render as
  // a blank "Hotel: " row.
  const logisticsEntries = LOGISTICS_FIELDS.map((field) => ({
    ...field,
    value: stop[field.key],
  })).filter((field) => field.value != null);
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
          <button
            type="button"
            aria-expanded={expanded}
            onClick={() => setExpanded((current) => !current)}
            className="flex items-center gap-2 text-left"
          >
            <h2>{stop.name}</h2>
            {expanded ? (
              <CaretUp weight="duotone" size={18} />
            ) : (
              <CaretDown weight="duotone" size={18} />
            )}
          </button>
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
          {logisticsEntries.map((field) => (
            <p key={field.key} className="text-muted">
              {field.label}: {field.value}
            </p>
          ))}
          <div onClick={(event) => event.stopPropagation()}>
            <OpenInGoogleMapsLink lat={stop.lat} lng={stop.lng} />
          </div>
        </div>
        <Button
          type="button"
          variant="ghost"
          icon
          onClick={(event) => {
            event.stopPropagation();
            setEditing(true);
          }}
          aria-label="Edit logistics"
        >
          <PencilSimple weight="duotone" size={20} />
        </Button>
      </div>

      {expanded && (
        <>
          {locatedPlaces.length > 0 && (
            <StopAreaMapLoader tripId={tripId} stop={stop} places={locatedPlaces} />
          )}
          <div className="flex flex-col gap-3">{children}</div>
        </>
      )}

      <Dialog
        open={editing}
        onClose={() => setEditing(false)}
        title={`${stop.name} logistics`}
      >
        <StopLogisticsForm
          tripId={tripId}
          stop={stop}
          onDone={() => setEditing(false)}
        />
      </Dialog>
    </section>
  );
}
