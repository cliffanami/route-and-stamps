import type { VoteLevel } from "@/types/database.types";

interface VoteScaleProps {
  value: VoteLevel | null;
  onChange: (level: VoteLevel) => void;
  disabled?: boolean;
}

// Color mapping per ARCHITECTURE.md §1b: Interested→Must go is an intensity
// ramp on the cyan accent (Broadsheet's rule is one accent for interactive
// elements, so the ramp is what carries five steps of emphasis); Skip is
// the one deliberate, separate-component use of the magenta accent.
const LEVELS: { value: VoteLevel; label: string; bg: string; fg: string }[] = [
  { value: "interested", label: "Interested", bg: "var(--color-accent-200)", fg: "var(--color-text)" },
  { value: "want", label: "Want", bg: "var(--color-accent-400)", fg: "var(--color-text)" },
  { value: "really_want", label: "Really want", bg: "var(--color-accent-600)", fg: "var(--color-bg)" },
  { value: "must_go", label: "Must go", bg: "var(--color-accent-700)", fg: "var(--color-bg)" },
  { value: "skip", label: "Skip", bg: "var(--color-accent-2)", fg: "var(--color-bg)" },
];

export function VoteScale({ value, onChange, disabled }: VoteScaleProps) {
  return (
    <div className="seg" role="radiogroup" aria-label="Your vote">
      {LEVELS.map((level) => {
        const checked = value === level.value;
        return (
          <label
            key={level.value}
            className="seg-opt"
            style={checked ? { background: level.bg, color: level.fg } : undefined}
          >
            <input
              type="radio"
              name="vote-level"
              value={level.value}
              checked={checked}
              disabled={disabled}
              onChange={() => onChange(level.value)}
            />
            {level.label}
          </label>
        );
      })}
    </div>
  );
}
