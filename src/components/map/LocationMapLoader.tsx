"use client";

import dynamic from "next/dynamic";

// Leaflet touches `window` at module load time, so LocationMap can't be
// server-rendered — `ssr: false` is only valid from a Client Component,
// hence this thin wrapper rather than calling dynamic() in the page itself.
const LocationMap = dynamic(
  () => import("./LocationMap").then((mod) => mod.LocationMap),
  {
    ssr: false,
    loading: () => <p className="text-muted">Loading map…</p>,
  },
);

interface LocationMapLoaderProps {
  lat: number;
  lng: number;
  title?: string;
  height?: number | string;
}

export function LocationMapLoader(props: LocationMapLoaderProps) {
  return <LocationMap {...props} />;
}
