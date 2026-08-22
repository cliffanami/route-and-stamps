// Case-insensitive best-effort match of an AI-proposed name against the
// trip's already-loaded places/stops (ROADMAP.md Milestone G) — an exact
// match wins; otherwise a substring match either direction (handles
// Claude shortening or expanding a name slightly). No match just means
// the resulting action proceeds unlinked, not a hard failure — mirrors
// how a tip or cost can already be saved with no place/stop link.
export function resolveIdByName(
  name: string,
  items: { id: string; name: string }[],
): string | null {
  const query = name.trim().toLowerCase();
  if (!query) return null;

  const exact = items.find((item) => item.name.toLowerCase() === query);
  if (exact) return exact.id;

  const partial = items.find((item) => {
    const itemName = item.name.toLowerCase();
    return itemName.includes(query) || query.includes(itemName);
  });
  return partial?.id ?? null;
}
