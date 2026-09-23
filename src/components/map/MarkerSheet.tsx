"use client";

import Link from "next/link";
import { ArrowRight } from "@phosphor-icons/react";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { CheckInControl } from "@/components/route/CheckInControl";
import { PlaceCheckInControl } from "@/components/places/PlaceCheckInControl";
import { OpenInGoogleMapsLink } from "./OpenInGoogleMapsLink";
import type { Place, PlaceCheckin, Stop, StopCheckin } from "@/types/database.types";

type MarkerSelection =
  | { kind: "stop"; stop: Stop }
  | { kind: "place"; place: Place };

interface MarkerSheetProps {
  tripId: string;
  selection: MarkerSelection | null;
  checkins: StopCheckin[];
  placeCheckins: PlaceCheckin[];
  onClose: () => void;
}

// Replaces Leaflet's own marker <Popup> on the main trip map (ROADMAP.md
// Milestone AG) — a tap opens this instead, map stays visible/interactive
// underneath. The small embedded maps elsewhere (StopAreaMap,
// LocationMapLoader) are untouched; this is scoped to MapView only.
export function MarkerSheet({ tripId, selection, checkins, placeCheckins, onClose }: MarkerSheetProps) {
  const title = selection
    ? selection.kind === "stop"
      ? selection.stop.name
      : selection.place.name
    : "";

  return (
    <BottomSheet open={selection !== null} onClose={onClose} title={title}>
      {selection?.kind === "stop" && (
        <>
          {selection.stop.town && <p className="text-muted">{selection.stop.town}</p>}
          <CheckInControl tripId={tripId} stop={selection.stop} checkins={checkins} />
          <div className="flex flex-col gap-2">
            <OpenInGoogleMapsLink lat={selection.stop.lat} lng={selection.stop.lng} />
            <Link
              href={`/trips/${tripId}/stops/${selection.stop.id}`}
              className="btn btn-primary"
            >
              View full details
              <ArrowRight weight="duotone" size={20} />
            </Link>
          </div>
        </>
      )}

      {selection?.kind === "place" && (
        <>
          {selection.place.town && <p className="text-muted">{selection.place.town}</p>}
          <PlaceCheckInControl tripId={tripId} place={selection.place} checkins={placeCheckins} />
          <div className="flex flex-col gap-2">
            {selection.place.lat !== null && selection.place.lng !== null && (
              <OpenInGoogleMapsLink lat={selection.place.lat} lng={selection.place.lng} />
            )}
            <Link
              href={`/trips/${tripId}/places/${selection.place.id}`}
              className="btn btn-primary"
            >
              View full details
              <ArrowRight weight="duotone" size={20} />
            </Link>
          </div>
        </>
      )}
    </BottomSheet>
  );
}
