import type { Stop, StopCheckin } from "@/types/database.types";

export type ArrivalStatus = "none" | "estimated" | "confirmed";

// Mirrors check_scheduled_arrivals()'s own "has this stop's estimated
// arrival passed" condition exactly (ROADMAP.md "Check-in") — a pending
// stop never estimates, arrival_time wins over the start_date fallback
// when set. "Confirmed" only once someone has actually tapped the
// check-in button; a passed estimate with nobody checked in yet is only
// ever "estimated", never silently upgraded.
export function arrivalStatus(stop: Stop, checkins: StopCheckin[]): ArrivalStatus {
  const hasCheckin = checkins.some((c) => c.stop_id === stop.id);
  if (hasCheckin) return "confirmed";

  if (stop.is_pending) return "none";

  const now = new Date();
  const estimateHasPassed = stop.arrival_time
    ? new Date(stop.arrival_time) <= now
    : stop.start_date
      ? new Date(stop.start_date) <= now
      : false;

  return estimateHasPassed ? "estimated" : "none";
}
