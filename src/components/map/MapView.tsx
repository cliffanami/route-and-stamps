"use client";

import "leaflet/dist/leaflet.css";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import Link from "next/link";
import { useStops } from "@/lib/queries/use-stops";
import { usePlaces } from "@/lib/queries/use-places";
import { CurrentPositionMarker } from "./CurrentPositionMarker";
import { circleIcon } from "./circle-icon";
import { TILE_LAYER_URL, TILE_LAYER_SUBDOMAINS, TILE_LAYER_ATTRIBUTION } from "./tile-layer-config";

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

  if (stopsLoading) {
    return <p className="px-6 py-4 text-muted">Loading…</p>;
  }

  if (stops.length === 0) {
    return <p className="px-6 py-4">No stops yet.</p>;
  }

  const bounds = L.latLngBounds(stops.map((stop) => [stop.lat, stop.lng]));
  const locatedPlaces = places.filter(
    (place) => place.lat !== null && place.lng !== null,
  );

  return (
    <div style={{ height: "calc(100dvh - var(--space-8) * 2)" }}>
      <MapContainer
        bounds={bounds}
        boundsOptions={{ padding: [32, 32] }}
        className="h-full w-full"
      >
        <TileLayer
          url={TILE_LAYER_URL}
          subdomains={TILE_LAYER_SUBDOMAINS}
          attribution={TILE_LAYER_ATTRIBUTION}
        />

        {stops.map((stop) => (
          <Marker key={stop.id} position={[stop.lat, stop.lng]} icon={stopIcon}>
            <Popup>{stop.name}</Popup>
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
  );
}
