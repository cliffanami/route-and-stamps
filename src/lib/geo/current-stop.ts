import { sortStopsByDate } from "./sort-stops-by-date";
import type { Stop, StopCheckin } from "@/types/database.types";

// "The trip is on" (ROADMAP.md "Check-in") — the map's live-mode signal
// is just the most recent check-in across the whole trip, by anyone, not
// a per-viewer thing. No checkins yet means the trip hasn't started (from
// this app's point of view) — the map stays in its normal full-route view.
export function currentStopFromCheckins(
  stops: Stop[],
  checkins: StopCheckin[],
): Stop | null {
  if (checkins.length === 0) return null;

  const latest = checkins.reduce((a, b) =>
    new Date(a.checked_in_at) > new Date(b.checked_in_at) ? a : b,
  );
  return stops.find((stop) => stop.id === latest.stop_id) ?? null;
}

// The stop right after the current one in date order — null if the
// current stop is the last one (nothing left to be "next").
export function nextStopAfter(stops: Stop[], current: Stop): Stop | null {
  const ordered = sortStopsByDate(stops);
  const index = ordered.findIndex((stop) => stop.id === current.id);
  if (index === -1) return null;
  return ordered[index + 1] ?? null;
}
