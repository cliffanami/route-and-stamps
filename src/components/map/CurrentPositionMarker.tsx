"use client";

import { useEffect, useState } from "react";
import { Marker, Popup } from "react-leaflet";
import L from "leaflet";

// Browser geolocation, foreground-only, never persisted (PRD §4b,
// ROADMAP.md M6) — watchPosition only runs while this component is
// mounted, which only happens while the Map tab is actually open; nothing
// here writes the position anywhere, it's local render state only.
const positionIcon = L.divIcon({
  className: "",
  html: `
    <div style="position:relative;width:14px;height:14px;">
      <div class="position-pulse-ring"></div>
      <div style="position:relative;width:14px;height:14px;border-radius:50%;background:var(--color-accent);border:2px solid var(--color-bg);box-shadow:var(--shadow-md);"></div>
    </div>
  `,
  iconSize: [14, 14],
  iconAnchor: [7, 7],
});

export function CurrentPositionMarker() {
  const [position, setPosition] = useState<[number, number] | null>(null);

  useEffect(() => {
    if (!navigator.geolocation) return;

    const watchId = navigator.geolocation.watchPosition(
      (pos) => setPosition([pos.coords.latitude, pos.coords.longitude]),
      () => setPosition(null),
      { enableHighAccuracy: true },
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, []);

  if (!position) return null;

  return (
    <Marker position={position} icon={positionIcon}>
      <Popup>You are here</Popup>
    </Marker>
  );
}
