import { haversineKm } from "./haversine";
import type { Stop } from "@/types/database.types";

// Auto-assignment for the Add-a-Place flow (ROADMAP.md M1) — manual
// dropdown is the fallback when this returns null (e.g. no stops yet).
export function nearestStop(
  lat: number,
  lng: number,
  stops: Stop[],
): Stop | null {
  if (stops.length === 0) return null;

  return stops.reduce((closest, stop) => {
    const distance = haversineKm(lat, lng, stop.lat, stop.lng);
    const closestDistance = haversineKm(lat, lng, closest.lat, closest.lng);
    return distance < closestDistance ? stop : closest;
  });
}
