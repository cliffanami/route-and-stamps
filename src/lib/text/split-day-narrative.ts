// stops.description holds 1-3 days of narrative as one combined block
// (deliberate — a dedicated day-level table was considered and deferred
// when this field was designed). This just renders it with visual breaks
// at display time, splitting on the "Day N" pattern the seeded text
// itself uses — pure display logic, no schema change. Text that doesn't
// match the pattern (a stop with fewer days, or free-form notes) falls
// back to one block, not an error.
//
// Splits at paragraph (blank-line) boundaries only, never mid-paragraph
// (ROADMAP.md Milestone O) — description is now a Markdown string, and a
// markdown emphasis span (**bold**) is always closed within the paragraph
// it opened in (CommonMark terminates inline spans at a blank line), so
// cutting between whole paragraphs can never orphan a formatting marker.
// Cutting mid-paragraph, which the original substring-position split did,
// could: bolding a "Day N —" heading itself is exactly the kind of
// formatting this field's new editor exists to enable.
export function splitDayNarrative(description: string): string[] {
  const paragraphs = description
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter((p) => p.length > 0);

  const dayBoundary = /^[*_#>\s]*Day \d+\s*[—-]/;
  const chunks: string[] = [];
  let current: string[] = [];

  for (const paragraph of paragraphs) {
    if (dayBoundary.test(paragraph) && current.length > 0) {
      chunks.push(current.join("\n\n"));
      current = [paragraph];
    } else {
      current.push(paragraph);
    }
  }
  if (current.length > 0) chunks.push(current.join("\n\n"));

  return chunks;
}
