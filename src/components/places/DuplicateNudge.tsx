import type { Place } from "@/types/database.types";

interface DuplicateNudgeProps {
  places: Place[];
}

// nearby_places() SQL function already flags anything within ~150m
// (ROADMAP.md M1) — this just surfaces that list; it's a nudge, not a
// block, so the form stays submittable regardless.
export function DuplicateNudge({ places }: DuplicateNudgeProps) {
  if (places.length === 0) return null;

  return (
    <div className="card">
      <p className="card-title">Might already be added</p>
      <ul className="card-body">
        {places.map((place) => (
          <li key={place.id}>
            {place.name}
            {place.town ? ` — ${place.town}` : ""}
          </li>
        ))}
      </ul>
    </div>
  );
}
