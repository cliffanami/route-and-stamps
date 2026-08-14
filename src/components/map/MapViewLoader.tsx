"use client";

import dynamic from "next/dynamic";

// Leaflet touches `window` at module load time, so MapView can't be
// server-rendered — `ssr: false` is only valid from a Client Component,
// hence this thin wrapper rather than calling dynamic() in the page itself.
const MapView = dynamic(() => import("./MapView").then((mod) => mod.MapView), {
  ssr: false,
  loading: () => <p className="px-6 py-4 text-muted">Loading map…</p>,
});

export function MapViewLoader({ tripId }: { tripId: string }) {
  return <MapView tripId={tripId} />;
}
