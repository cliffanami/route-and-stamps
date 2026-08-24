"use client";

import { HandWaving } from "@phosphor-icons/react";
import { Tag } from "@/components/ui/Tag";
import { Button } from "@/components/ui/Button";
import { useCurrentUserId } from "@/lib/queries/use-current-user";
import { useToggleCheckin } from "@/lib/queries/use-stop-checkins";
import { useTripMembers } from "@/lib/queries/use-trip-members";
import { arrivalStatus } from "@/lib/geo/arrival-status";
import type { Stop, StopCheckin } from "@/types/database.types";

interface CheckInControlProps {
  tripId: string;
  stop: Stop;
  checkins: StopCheckin[];
  // Fires only on the not-checked-in → checked-in transition, not on an
  // uncheck — lets the two callers surface "here's what's planned" their
  // own way (StopCard expands its inline place list; Stop Detail jumps to
  // its Places tab) without CheckInControl knowing which.
  onCheckedIn?: () => void;
}

// Tap-to-confirm arrival (ROADMAP.md "Check-in") — entirely manual, never
// geolocation-triggered, same privacy line the current-position map pin
// already draws. Shared by StopCard (Route page) and Stop Detail's
// Overview tab, not two separate implementations.
export function CheckInControl({ tripId, stop, checkins, onCheckedIn }: CheckInControlProps) {
  const userId = useCurrentUserId();
  const toggleCheckin = useToggleCheckin(tripId);
  const { data: members = [] } = useTripMembers(tripId);

  const status = arrivalStatus(stop, checkins);
  const stopCheckins = checkins.filter((c) => c.stop_id === stop.id);
  const iAmCheckedIn = stopCheckins.some((c) => c.user_id === userId);
  const checkedInNames = stopCheckins
    .map((c) => members.find((m) => m.user_id === c.user_id)?.displayName ?? "Someone")
    .join(", ");

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {status === "estimated" && <Tag variant="neutral">Estimated</Tag>}
      {status === "confirmed" && <Tag variant="accent">Confirmed</Tag>}

      <Button
        type="button"
        variant={iAmCheckedIn ? "primary" : "secondary"}
        onClick={() => {
          const wasCheckedIn = iAmCheckedIn;
          toggleCheckin.mutate(
            { stopId: stop.id, checkedIn: iAmCheckedIn },
            { onSuccess: () => { if (!wasCheckedIn) onCheckedIn?.(); } },
          );
        }}
        disabled={toggleCheckin.isPending || !userId}
      >
        <HandWaving weight="duotone" size={18} />
        {iAmCheckedIn ? "Checked in" : "I'm here"}
      </Button>

      {checkedInNames && <span className="text-muted">{checkedInNames}</span>}
    </div>
  );
}
