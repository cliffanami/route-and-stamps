"use client";

import { HandWaving } from "@phosphor-icons/react";
import { Button } from "@/components/ui/Button";
import { useCurrentUserId } from "@/lib/queries/use-current-user";
import { useCheckInPlace } from "@/lib/queries/use-place-checkins";
import { useTripMembers } from "@/lib/queries/use-trip-members";
import type { Place, PlaceCheckin } from "@/types/database.types";

interface PlaceCheckInControlProps {
  tripId: string;
  place: Place;
  checkins: PlaceCheckin[];
}

// Active check-in (ROADMAP.md Milestone Y), replacing the old passive
// "mark as visited" toggle — mirrors CheckInControl's stop pattern exactly
// (same icon, same "I'm here" label) rather than a second, different
// mental model for places vs. stops. Checking in here also clears any
// other place_checkins row this user holds at a place sharing the same
// stop (see useCheckInPlace) — can't be in two places at once. Deliberately
// Place Detail only, not inline on every place card. No notification on
// checking into a place, unlike stop check-in — a trip can have many
// places, and "confirmed arrival at a whole new stop" is a different order
// of event than "checked in at one place on the list."
export function PlaceCheckInControl({ tripId, place, checkins }: PlaceCheckInControlProps) {
  const userId = useCurrentUserId();
  const checkIn = useCheckInPlace(tripId);
  const { data: members = [] } = useTripMembers(tripId);

  const placeCheckins = checkins.filter((c) => c.place_id === place.id);
  const iAmCheckedIn = placeCheckins.some((c) => c.user_id === userId);
  const checkedInNames = placeCheckins
    .map((c) => members.find((m) => m.user_id === c.user_id)?.displayName ?? "Someone")
    .join(", ");

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <Button
        type="button"
        variant={iAmCheckedIn ? "primary" : "secondary"}
        onClick={() =>
          checkIn.mutate({ placeId: place.id, checkedIn: iAmCheckedIn })
        }
        disabled={checkIn.isPending || !userId}
      >
        <HandWaving weight="duotone" size={18} />
        {iAmCheckedIn ? "Checked in" : "I'm here"}
      </Button>

      {checkedInNames && <span className="text-muted">{checkedInNames}</span>}
    </div>
  );
}
