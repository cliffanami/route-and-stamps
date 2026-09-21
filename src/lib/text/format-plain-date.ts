// A "YYYY-MM-DD" date string (places.date, stops.start_date/end_date) has
// no time component — parsed as local calendar parts, not fed straight to
// `new Date()`, so the displayed day never shifts by one from a
// UTC-vs-local interpretation of a bare date. Shared by every place that
// displays one of these dates (ItineraryView, PlaceDetail, PlaceRow) so the
// parsing fix lives in one place, not reimplemented per call site.
export function formatPlainDate(
  iso: string,
  options: Intl.DateTimeFormatOptions = { month: "short", day: "numeric" },
): string {
  return parsePlainDate(iso).toLocaleDateString("en-US", options);
}

// The same local-calendar-parts parsing, exposed directly for date
// arithmetic (e.g. a trip countdown) rather than just display formatting.
export function parsePlainDate(iso: string): Date {
  const [year, month, day] = iso.split("-").map(Number);
  return new Date(year, month - 1, day);
}
