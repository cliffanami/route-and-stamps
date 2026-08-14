"use client";

import "leaflet/dist/leaflet.css";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import Link from "next/link";
import { useStops } from "@/lib/queries/use-stops";
import { usePlaces } from "@/lib/queries/use-places";
import { CurrentPositionMarker } from "./CurrentPositionMarker";

interface MapViewProps {
  tripId: string;
}

// Plain colored circles via DivIcon, not Leaflet's default pin graphic —
// avoids the marker-image asset-path config Leaflet needs under Next.js
// bundling, and reads as Broadsheet rather than generic-map-library.
// Both stops and places stay in the cyan accent family, differentiated by
// size/fill rather than a second accent color (CONVENTIONS.md §5b: never
// both accents in one small component — and a map with both marker types
// visible at once is exactly that component).
function circleIcon(diameter: number, filled: boolean) {
  return L.divIcon({
    className: "",
    html: `<div style="width:${diameter}px;height:${diameter}px;border-radius:50%;background:${
      filled ? "var(--color-accent)" : "var(--color-bg)"
    };border:2px solid var(--color-accent);box-shadow:var(--shadow-sm);"></div>`,
    iconSize: [diameter, diameter],
    iconAnchor: [diameter / 2, diameter / 2],
  });
}

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
        {/* Standard OSM raster tiles bake place labels into the image in the
        local script (e.g. 東京都 rather than Tokyo) — unlike the Nominatim
        proxy, there's no accept-language header that can fix this, since
        tiles are pre-rendered PNGs cached by URL and can't vary per
        requester (confirmed Wikimedia's "osm-intl" style doesn't either,
        for the same caching reason). CARTO's Voyager basemap renders the
        same OSM data with labels already romanized at the tile level, and
        is still free and keyless. */}
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png"
          subdomains="abcd"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
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
