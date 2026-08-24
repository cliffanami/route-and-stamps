"use client";

import { CheckCircle, Circle } from "@phosphor-icons/react";
import { Button } from "@/components/ui/Button";
import { useCurrentUserId } from "@/lib/queries/use-current-user";
import { useTogglePlaceVisited } from "@/lib/queries/use-place-checkins";
import { useTripMembers } from "@/lib/queries/use-trip-members";
import type { Place, PlaceCheckin } from "@/types/database.types";

interface PlaceVisitedControlProps {
  tripId: string;
  place: Place;
  checkins: PlaceCheckin[];
}

// ROADMAP.md "Places, extended" — "have we actually been here" as real
// data (place_checkins, one row per person, replacing the dormant
// visited_at column it never used to back). Deliberately Place Detail
// only, not inline on every place card — marking a place visited is a
// deliberate action, not something to fire off mid-scroll. No
// notification on visiting a place, unlike stop check-in — a trip can
// have many places, and "confirmed arrival at a whole new stop" is a
// different order of event than "ticked off one place on the list."
export function PlaceVisitedControl({ tripId, place, checkins }: PlaceVisitedControlProps) {
  const userId = useCurrentUserId();
  const toggleVisited = useTogglePlaceVisited(tripId);
  const { data: members = [] } = useTripMembers(tripId);

  const placeCheckins = checkins.filter((c) => c.place_id === place.id);
  const iHaveVisited = placeCheckins.some((c) => c.user_id === userId);
  const visitedNames = placeCheckins
    .map((c) => members.find((m) => m.user_id === c.user_id)?.displayName ?? "Someone")
    .join(", ");

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <Button
        type="button"
        variant={iHaveVisited ? "primary" : "secondary"}
        onClick={() =>
          toggleVisited.mutate({ placeId: place.id, visited: iHaveVisited })
        }
        disabled={toggleVisited.isPending || !userId}
      >
        {iHaveVisited ? (
          <CheckCircle weight="duotone" size={18} />
        ) : (
          <Circle weight="duotone" size={18} />
        )}
        {iHaveVisited ? "Visited" : "Mark as visited"}
      </Button>

      {visitedNames && <span className="text-muted">{visitedNames}</span>}
    </div>
  );
}
