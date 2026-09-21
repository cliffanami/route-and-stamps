"use client";

import type { TodoPhase } from "@/types/database.types";

const PHASE_LABEL: Record<TodoPhase, string> = {
  pre_trip: "Pre-trip",
  during_trip: "During",
  post_trip: "Post-trip",
};

const PHASES: TodoPhase[] = ["pre_trip", "during_trip", "post_trip"];

interface PhaseFilterProps {
  selected: TodoPhase | null;
  onChange: (phase: TodoPhase | null) => void;
}

// Mirrors CategoryFilter's tag-chip pattern (Tips' category filter) — a
// dedicated component rather than reusing CategoryFilter directly since
// phase is a fixed 3-value enum needing label mapping, not a free-form
// string list (ROADMAP.md Milestone AE).
export function PhaseFilter({ selected, onChange }: PhaseFilterProps) {
  return (
    <div className="flex flex-wrap gap-2">
      <button
        type="button"
        className={`tag ${selected === null ? "tag-accent" : "tag-neutral"}`}
        onClick={() => onChange(null)}
      >
        All
      </button>
      {PHASES.map((phase) => (
        <button
          key={phase}
          type="button"
          className={`tag ${selected === phase ? "tag-accent" : "tag-neutral"}`}
          onClick={() => onChange(selected === phase ? null : phase)}
        >
          {PHASE_LABEL[phase]}
        </button>
      ))}
    </div>
  );
}

export { PHASE_LABEL };
