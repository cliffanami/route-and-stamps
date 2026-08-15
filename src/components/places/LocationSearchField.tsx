"use client";

import { useEffect, useRef, useState, type KeyboardEvent } from "react";

export interface LocationSearchResult {
  label: string;
  lat: number;
  lng: number;
  town: string | null;
}

interface LocationSearchFieldProps {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  onSelect: (result: LocationSearchResult) => void;
  placeholder?: string;
  required?: boolean;
}

const MIN_QUERY_LENGTH = 3;
// Nominatim's usage policy asks for roughly one request/second per app —
// this debounce is what keeps a fast typist from firing a search per
// keystroke; it's a convenience layer in front of the same /api/geocode
// proxy the explicit "Find location" fallback below it already uses.
const DEBOUNCE_MS = 350;

// Live autocomplete dropdown, shared by PlaceForm and AddStopForm — types
// a name, sees matching real places as they type (ARCHITECTURE.md §1c
// flagged this exact gap: "no disambiguation UI today"). Purely additive:
// on a miss, or if the user just prefers it, the existing button-triggered
// search (including the Tier 2 AI fallback) still works unchanged.
export function LocationSearchField({
  id,
  label,
  value,
  onChange,
  onSelect,
  placeholder,
  required,
}: LocationSearchFieldProps) {
  const [results, setResults] = useState<LocationSearchResult[]>([]);
  const [open, setOpen] = useState(false);
  const [searching, setSearching] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const requestIdRef = useRef(0);
  // Selecting a suggestion changes `value` via the parent's onSelect
  // handler (it renames the field to the matched result) — without this,
  // that programmatic change re-triggers this same effect and reopens the
  // dropdown with fresh results for the now-different text right after
  // the user just picked one. Suppresses exactly the one search cycle
  // that immediately follows a selection, not real subsequent typing.
  const suppressNextSearchRef = useRef(false);

  useEffect(() => {
    if (suppressNextSearchRef.current) {
      suppressNextSearchRef.current = false;
      return;
    }

    const query = value.trim();
    // No setState here for the too-short case — the render guard below
    // (which checks `value` directly) already hides any stale dropdown,
    // so there's nothing to synchronously clear from inside the effect.
    if (query.length < MIN_QUERY_LENGTH) {
      return;
    }

    const requestId = ++requestIdRef.current;
    const timer = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await fetch(`/api/geocode?q=${encodeURIComponent(query)}`);
        if (!res.ok || requestId !== requestIdRef.current) return;
        const body = (await res.json()) as { results: LocationSearchResult[] };
        setResults(body.results ?? []);
        setOpen(true);
        setActiveIndex(-1);
      } catch {
        // Convenience layer — a failed live lookup just means no dropdown;
        // the button below still runs the full existing search flow.
      } finally {
        if (requestId === requestIdRef.current) setSearching(false);
      }
    }, DEBOUNCE_MS);

    return () => clearTimeout(timer);
  }, [value]);

  useEffect(() => {
    function handleOutsideClick(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  function selectResult(result: LocationSearchResult) {
    suppressNextSearchRef.current = true;
    onSelect(result);
    setOpen(false);
    setResults([]);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (!open || results.length === 0) return;
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, results.length - 1));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (event.key === "Enter" && activeIndex >= 0) {
      event.preventDefault();
      selectResult(results[activeIndex]);
    } else if (event.key === "Escape") {
      setOpen(false);
    }
  }

  return (
    <div className="field" style={{ position: "relative" }} ref={containerRef}>
      <label htmlFor={id}>{label}</label>
      <input
        id={id}
        className="input"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onFocus={() => results.length > 0 && setOpen(true)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        required={required}
        autoComplete="off"
        role="combobox"
        aria-expanded={open}
        aria-controls={`${id}-listbox`}
        aria-autocomplete="list"
      />
      {searching && <p className="text-muted">Searching…</p>}
      {open && results.length > 0 && value.trim().length >= MIN_QUERY_LENGTH && (
        <ul
          id={`${id}-listbox`}
          role="listbox"
          className="elev-md"
          style={{
            position: "absolute",
            top: "100%",
            left: 0,
            right: 0,
            zIndex: 20,
            marginTop: 4,
            background: "var(--color-surface)",
            borderRadius: "var(--radius-md)",
            overflow: "hidden",
            listStyle: "none",
            padding: 0,
          }}
        >
          {results.map((result, index) => (
            <li key={`${result.lat},${result.lng}`} role="option" aria-selected={index === activeIndex}>
              <button
                type="button"
                onClick={() => selectResult(result)}
                onMouseEnter={() => setActiveIndex(index)}
                style={{
                  display: "block",
                  width: "100%",
                  textAlign: "left",
                  padding: "var(--space-2) var(--space-3)",
                  background:
                    index === activeIndex
                      ? "color-mix(in srgb, var(--color-accent) 10%, transparent)"
                      : "transparent",
                  border: "none",
                  cursor: "pointer",
                  font: "inherit",
                  color: "inherit",
                }}
              >
                {result.label}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
