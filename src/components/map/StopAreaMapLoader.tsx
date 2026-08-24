"use client";

import dynamic from "next/dynamic";
import type { Place, PlaceCheckin, Stop } from "@/types/database.types";

// Leaflet touches `window` at module load time, so StopAreaMap can't be
// server-rendered — `ssr: false` is only valid from a Client Component,
// hence this thin wrapper rather than calling dynamic() in the page itself.
const StopAreaMap = dynamic(
  () => import("./StopAreaMap").then((mod) => mod.StopAreaMap),
  {
    ssr: false,
    loading: () => <p className="text-muted">Loading map…</p>,
  },
);

interface StopAreaMapLoaderProps {
  tripId: string;
  stop: Stop;
  places: Place[];
  placeCheckins?: PlaceCheckin[];
}

export function StopAreaMapLoader(props: StopAreaMapLoaderProps) {
  return <StopAreaMap {...props} />;
}
