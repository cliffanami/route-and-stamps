"use client";

import "leaflet/dist/leaflet.css";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import { circleIcon } from "./circle-icon";
import { TILE_LAYER_URL, TILE_LAYER_SUBDOMAINS, TILE_LAYER_ATTRIBUTION } from "./tile-layer-config";

interface LocationMapProps {
  lat: number;
  lng: number;
  title?: string;
  height?: number | string;
}

const markerIcon = circleIcon(16, true);

// Single-pin map for a place/stop detail view — distinct from MapView,
// which plots every stop and place on the trip at once. Same tile source
// and marker styling as MapView so a pin looks identical wherever it shows
// up.
export function LocationMap({ lat, lng, title, height = 240 }: LocationMapProps) {
  return (
    <div style={{ height, borderRadius: "var(--radius-md)", overflow: "hidden" }}>
      <MapContainer
        center={[lat, lng]}
        zoom={14}
        scrollWheelZoom={false}
        className="h-full w-full"
      >
        <TileLayer
          url={TILE_LAYER_URL}
          subdomains={TILE_LAYER_SUBDOMAINS}
          attribution={TILE_LAYER_ATTRIBUTION}
        />
        <Marker position={[lat, lng]} icon={markerIcon}>
          {title && <Popup>{title}</Popup>}
        </Marker>
      </MapContainer>
    </div>
  );
}
