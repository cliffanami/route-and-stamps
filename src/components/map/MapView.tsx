"use client";

import "leaflet/dist/leaflet.css";
import { MapContainer, TileLayer, Marker, Popup, Polyline } from "react-leaflet";
import L from "leaflet";
import Link from "next/link";
import { useStops } from "@/lib/queries/use-stops";
import { usePlaces } from "@/lib/queries/use-places";
import { useTrip } from "@/lib/queries/use-trip";
import { useStopCheckins } from "@/lib/queries/use-stop-checkins";
import { sortStopsByDate } from "@/lib/geo/sort-stops-by-date";
import { currentStopFromCheckins, nextStopAfter } from "@/lib/geo/current-stop";
import { CurrentPositionMarker } from "./CurrentPositionMarker";
import { circleIcon } from "./circle-icon";
import { TILE_LAYER_URL, TILE_LAYER_SUBDOMAINS, TILE_LAYER_ATTRIBUTION } from "./tile-layer-config";
import {
  NEUTRAL_LINE_STYLE,
  leafletDashArray,
  transportModeLineStyle,
} from "./transport-mode-line-style";

interface MapViewProps {
  tripId: string;
}

// Both stops and places stay in the cyan accent family, differentiated by
// size/fill rather than a second accent color (CONVENTIONS.md §5b: never
// both accents in one small component — and a map with both marker types
// visible at once is exactly that component).
const stopIcon = circleIcon(16, true);
const placeIcon = circleIcon(12, false);

export function MapView({ tripId }: MapViewProps) {
  const { data: stops = [], isLoading: stopsLoading } = useStops(tripId);
  const { data: places = [] } = usePlaces(tripId);
  const { data: trip } = useTrip(tripId);
  const { data: checkins = [] } = useStopCheckins(tripId);

  if (stopsLoading) {
    return <p className="px-6 py-4 text-muted">Loading…</p>;
  }

  if (stops.length === 0) {
    return <p className="px-6 py-4">No stops yet.</p>;
  }

  // "The trip is on" (ROADMAP.md "Check-in") — once anyone's checked into
  // a stop, the map opens zoomed in close on that stop alone (Milestone M
  // tightened this from "fit both the current and next stop" — the
  // banner text below already carries "what's coming", so the map itself
  // doesn't need to stay wide enough to fit two pins). No checkins yet
  // (trip hasn't started, from the app's point of view) keeps today's
  // full-route fit-to-bounds view unchanged.
  const currentStop = currentStopFromCheckins(stops, checkins);
  const nextStop = currentStop ? nextStopAfter(stops, currentStop) : null;

  // A single point has no "size" to fit bounds to — Leaflet would just
  // snap to its max zoom (street-level, losing all context). center+zoom
  // at a fixed, deliberate "town/neighborhood" level instead.
  const CURRENT_STOP_ZOOM = 14;
  const viewProps = currentStop
    ? { center: [currentStop.lat, currentStop.lng] as [number, number], zoom: CURRENT_STOP_ZOOM }
    : {
        bounds: L.latLngBounds(stops.map((stop) => [stop.lat, stop.lng])),
        boundsOptions: { padding: [32, 32] as [number, number] },
      };
  const locatedPlaces = places.filter(
    (place) => place.lat !== null && place.lng !== null,
  );

  // Same ordering rule the Route page uses (ROADMAP.md Milestone C's
  // date-based-ordering pivot) — one segment per consecutive stop pair,
  // colored by the *arriving* stop's transport_mode.
  const orderedStops = sortStopsByDate(stops);
  const transportModes = trip?.transport_modes ?? [];
  const segments = orderedStops.slice(1).map((stop, i) => {
    const previousStop = orderedStops[i];
    return {
      id: stop.id,
      positions: [
        [previousStop.lat, previousStop.lng],
        [stop.lat, stop.lng],
      ] as [number, number][],
      mode: stop.transport_mode,
      style: transportModeLineStyle(stop.transport_mode, transportModes),
    };
  });

  const usedModes = Array.from(
    new Set(
      segments
        .map((segment) => segment.mode)
        .filter((mode): mode is string => mode !== null),
    ),
  );
  const hasUnsetSegment = segments.some((segment) => segment.mode === null);

  const hasLegend = usedModes.length > 0 || hasUnsetSegment;

  return (
    <div className="flex flex-col gap-2">
      {currentStop && (
        <p className="px-4 text-muted">
          You&rsquo;re in <strong>{currentStop.name}</strong>
          {nextStop &&
            (() => {
              const nextDate = nextStop.start_date
                ? new Date(nextStop.start_date).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                  })
                : null;
              return (
                <>
                  {" "}
                  · Next: {nextStop.name}
                  {nextDate && ` on ${nextDate}`}
                </>
              );
            })()}
        </p>
      )}

      {/* A fixed proportion rather than "fill the exact remaining pixels"
          (BottomNav's real height is content-driven, not a fixed constant,
          so pixel-precise budgeting silently drifts) — the page scrolls if
          the legend pushes past the fold, and TripLayout's pb-20 already
          reserves clearance so scrolled content isn't hidden behind the
          fixed nav. */}
      <div style={{ height: "70dvh" }}>
        {/* react-leaflet's MapContainer only reads bounds/center/zoom at
            construction time — it doesn't re-apply them on a later
            re-render. useStopCheckins resolves a moment after first
            paint (starting from an empty default), so without a key
            forcing a fresh mount once currentStop is known, the map
            would silently stay on its initial fit-to-bounds view even
            after check-in data arrives, while the banner text (a plain
            React re-render) updates fine regardless. */}
        <MapContainer key={currentStop?.id ?? "full-trip"} {...viewProps} className="h-full w-full">
          <TileLayer
            url={TILE_LAYER_URL}
            subdomains={TILE_LAYER_SUBDOMAINS}
            attribution={TILE_LAYER_ATTRIBUTION}
          />

          {segments.map((segment) => (
            <Polyline
              key={segment.id}
              positions={segment.positions}
              pathOptions={{
                color: segment.style.color,
                dashArray: leafletDashArray(segment.style.dashStyle),
                weight: 4,
              }}
            />
          ))}

          {stops.map((stop) => (
            <Marker key={stop.id} position={[stop.lat, stop.lng]} icon={stopIcon}>
              <Popup>
                <Link href={`/trips/${tripId}/stops/${stop.id}`}>{stop.name}</Link>
              </Popup>
            </Marker>
          ))}

          {locatedPlaces.map((place) => (
            <Marker
              key={place.id}
              position={[place.lat!, place.lng!]}
              icon={placeIcon}
            >
              <Popup>
                <Link href={`/trips/${tripId}/places/${place.id}`}>
                  {place.name}
                </Link>
              </Popup>
            </Marker>
          ))}

          <CurrentPositionMarker />
        </MapContainer>
      </div>

      {hasLegend && (
        <div className="flex flex-wrap items-center gap-3 px-4 py-2">
          {usedModes.map((mode) => {
            const style = transportModeLineStyle(mode, transportModes);
            return (
              <span key={mode} className="flex items-center gap-1.5">
                <span
                  aria-hidden="true"
                  style={{
                    display: "inline-block",
                    width: 24,
                    borderTop: `3px ${style.dashStyle} ${style.color}`,
                  }}
                />
                {mode}
              </span>
            );
          })}
          {hasUnsetSegment && (
            <span className="flex items-center gap-1.5 text-muted">
              <span
                aria-hidden="true"
                style={{
                  display: "inline-block",
                  width: 24,
                  borderTop: `3px ${NEUTRAL_LINE_STYLE.dashStyle} ${NEUTRAL_LINE_STYLE.color}`,
                }}
              />
              Not set
            </span>
          )}
        </div>
      )}
    </div>
  );
}
