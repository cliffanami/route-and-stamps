// Tier 1 of M1.5's cascading place-name resolution (ARCHITECTURE.md §1c) —
// a free, always-on heuristic that strips narrative filler and normalizes
// simple "<Name> in <City>" structure before handing off to the existing
// Nominatim search. Pure string logic, no external calls; imperfect matches
// still pass through to Nominatim's own fuzzy search rather than blocking.

const FILLER_PATTERNS: RegExp[] = [
  /\b(?:i\s+|we\s+)?(?:just\s+)?(?:posted|saw|found|watched)\s+(?:a\s+)?(?:video|reel|post|story)\s+about\s+/gi,
  /\bcheck\s+(?:this|it)\s+out[,:\s]*/gi,
  /\bcheck\s+out\s+/gi,
  /\byou\s+(?:have|gotta|got)\s+to\s+see\s+(?:this\s+|that\s+)?/gi,
  /\b(?:this\s+)?reminds?\s+me\s+of\s+/gi,
  /\bfound\s+this\s+place\s+called\s+/gi,
  /\bthis\s+is\s+/gi,
];

const HASHTAG_PATTERN = /#\S+/g;
// Common pictographic/symbol/flag Unicode blocks.
const EMOJI_PATTERN =
  /[\u{1F1E6}-\u{1F1FF}\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{2190}-\u{21FF}\u{2B00}-\u{2BFF}]/gu;

// Deliberately requires a capitalized city to avoid over-matching ordinary
// sentences containing "in" (e.g. "cool ramen place in the market").
const IN_CITY_PATTERN = /^(.+?)\s+in\s+([A-Z][\w'-]*(?:\s+[A-Z][\w'-]*)*)$/;

export interface ParsedPlaceMention {
  query: string;
  /** True when any filler/hashtag/emoji stripping or reformatting changed the input. */
  matched: boolean;
}

export function parsePlaceMention(input: string): ParsedPlaceMention {
  let text = input;
  let matched = false;

  for (const pattern of FILLER_PATTERNS) {
    const next = text.replace(pattern, " ");
    if (next !== text) matched = true;
    text = next;
  }

  const withoutHashtags = text.replace(HASHTAG_PATTERN, " ");
  if (withoutHashtags !== text) matched = true;
  text = withoutHashtags;

  const withoutEmoji = text.replace(EMOJI_PATTERN, " ");
  if (withoutEmoji !== text) matched = true;
  text = withoutEmoji;

  text = text
    .replace(/\s+/g, " ")
    .replace(/^[\s:,\-–—.]+/, "")
    .replace(/[\s:,\-–—.]+$/, "")
    .trim();

  const inCityMatch = text.match(IN_CITY_PATTERN);
  if (inCityMatch) {
    text = `${inCityMatch[1].trim()}, ${inCityMatch[2].trim()}`;
    matched = true;
  }

  return { query: text || input.trim(), matched };
}
