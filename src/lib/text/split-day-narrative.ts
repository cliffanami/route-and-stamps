// stops.description holds 1-3 days of narrative as one combined block
// (deliberate — a dedicated day-level table was considered and deferred
// when this field was designed). This just renders it with visual breaks
// at display time, splitting on the "Day N" pattern the seeded text
// itself uses — pure display logic, no schema change. Text that doesn't
// match the pattern (a stop with fewer days, or free-form notes) falls
// back to one block, not an error.
export function splitDayNarrative(description: string): string[] {
  const parts = description.split(/(?=Day \d+\s*[—-])/).map((p) => p.trim());
  return parts.filter((p) => p.length > 0);
}
