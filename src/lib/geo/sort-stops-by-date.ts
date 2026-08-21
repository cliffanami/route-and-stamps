import type { Stop } from "@/types/database.types";

// Route page ordering (ROADMAP.md Milestone C's date-based-ordering pivot)
// — dated stops sort chronologically by start_date; an undated stop (just
// added, no date set yet) falls back to order_index, and sorts after every
// dated stop rather than interleaving with them by insertion order alone.
export function sortStopsByDate(stops: Stop[]): Stop[] {
  return [...stops].sort((a, b) => {
    if (a.start_date && b.start_date) {
      return a.start_date.localeCompare(b.start_date);
    }
    if (a.start_date) return -1;
    if (b.start_date) return 1;
    return a.order_index - b.order_index;
  });
}
