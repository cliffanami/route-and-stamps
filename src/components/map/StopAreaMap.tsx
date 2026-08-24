"use client";

import "leaflet/dist/leaflet.css";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import Link from "next/link";
import { circleIcon } from "./circle-icon";
import { TILE_LAYER_URL, TILE_LAYER_SUBDOMAINS, TILE_LAYER_ATTRIBUTION } from "./tile-layer-config";
import type { Place, PlaceCheckin, Stop } from "@/types/database.types";

interface StopAreaMapProps {
  tripId: string;
  stop: Stop;
  places: Place[];
  placeCheckins?: PlaceCheckin[];
}

// "The plot of all places around the city/town" — a stop-scoped map, not
// the full-trip MapView. Same marker language (filled = stop, outlined =
// place, dimmed = visited) and CARTO tiles, just bounded to one stop's
// area instead of the whole itinerary.
const stopIcon = circleIcon(16, true);
const placeIcon = circleIcon(12, false);
const visitedPlaceIcon = circleIcon(12, false, 0.4);

export function StopAreaMap({ tripId, stop, places, placeCheckins = [] }: StopAreaMapProps) {
  const visitedPlaceIds = new Set(placeCheckins.map((c) => c.place_id));
  const bounds = L.latLngBounds([
    [stop.lat, stop.lng],
    ...places.map((place): [number, number] => [place.lat!, place.lng!]),
  ]);

  return (
    <div style={{ height: 260, borderRadius: "var(--radius-md)", overflow: "hidden" }}>
      <MapContainer
        bounds={bounds}
        boundsOptions={{ padding: [24, 24] }}
        scrollWheelZoom={false}
        className="h-full w-full"
      >
        <TileLayer
          url={TILE_LAYER_URL}
          subdomains={TILE_LAYER_SUBDOMAINS}
          attribution={TILE_LAYER_ATTRIBUTION}
        />

        <Marker position={[stop.lat, stop.lng]} icon={stopIcon}>
          <Popup>{stop.name}</Popup>
        </Marker>

        {places.map((place) => (
          <Marker
            key={place.id}
            position={[place.lat!, place.lng!]}
            icon={visitedPlaceIds.has(place.id) ? visitedPlaceIcon : placeIcon}
          >
            <Popup>
              <Link href={`/trips/${tripId}/places/${place.id}`}>
                {place.name}
              </Link>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}
