"use client";

import { useState } from "react";
import { HandWaving } from "@phosphor-icons/react";
import { Tag } from "@/components/ui/Tag";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { useCurrentUserId } from "@/lib/queries/use-current-user";
import { useToggleCheckin } from "@/lib/queries/use-stop-checkins";
import { useTripMembers } from "@/lib/queries/use-trip-members";
import { useSetStopStartDate } from "@/lib/queries/use-stops";
import { arrivalStatus } from "@/lib/geo/arrival-status";
import { formatPlainDate } from "@/lib/text/format-plain-date";
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

function todayIso(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

// Tap-to-confirm arrival (ROADMAP.md "Check-in") — entirely manual, never
// geolocation-triggered, same privacy line the current-position map pin
// already draws. Shared by StopCard (Route page) and Stop Detail's
// Overview tab, not two separate implementations.
export function CheckInControl({ tripId, stop, checkins, onCheckedIn }: CheckInControlProps) {
  const userId = useCurrentUserId();
  const toggleCheckin = useToggleCheckin(tripId);
  const setStopStartDate = useSetStopStartDate(tripId);
  const { data: members = [] } = useTripMembers(tripId);
  // Live-usage feedback: checking in before a stop's expected start_date
  // (an early arrival) is common enough that it should prompt to update
  // the schedule, not just silently confirm — otherwise the stop's own
  // date drifts out of sync with reality the same way trip.start_date
  // already had to be corrected by hand once.
  const [showEarlyPrompt, setShowEarlyPrompt] = useState(false);

  const status = arrivalStatus(stop, checkins);
  const stopCheckins = checkins.filter((c) => c.stop_id === stop.id);
  const iAmCheckedIn = stopCheckins.some((c) => c.user_id === userId);
  const checkedInNames = stopCheckins
    .map((c) => members.find((m) => m.user_id === c.user_id)?.displayName ?? "Someone")
    .join(", ");

  const today = todayIso();
  const isEarly = stop.start_date !== null && today < stop.start_date;

  function handleClick() {
    const wasCheckedIn = iAmCheckedIn;
    toggleCheckin.mutate(
      { stopId: stop.id, checkedIn: iAmCheckedIn },
      {
        onSuccess: () => {
          if (!wasCheckedIn) {
            onCheckedIn?.();
            if (isEarly) setShowEarlyPrompt(true);
          }
        },
      },
    );
  }

  async function handleUpdateDate() {
    await setStopStartDate.mutateAsync({ stopId: stop.id, startDate: today });
    setShowEarlyPrompt(false);
  }

  return (
    <>
      <div className="flex items-center gap-2 flex-wrap">
        {status === "estimated" && <Tag variant="neutral">Estimated</Tag>}
        {status === "confirmed" && <Tag variant="accent">Confirmed</Tag>}

        <Button
          type="button"
          variant={iAmCheckedIn ? "primary" : "secondary"}
          onClick={handleClick}
          disabled={toggleCheckin.isPending || !userId}
        >
          <HandWaving weight="duotone" size={18} />
          {iAmCheckedIn ? "Checked in" : "I'm here"}
        </Button>

        {checkedInNames && <span className="text-muted">{checkedInNames}</span>}
      </div>

      <Dialog
        open={showEarlyPrompt}
        onClose={() => setShowEarlyPrompt(false)}
        title="Arrived early?"
      >
        <div className="flex flex-col gap-4">
          <p className="text-muted">
            {stop.name} was expected to start{" "}
            {stop.start_date &&
              formatPlainDate(stop.start_date, {
                weekday: "short",
                month: "short",
                day: "numeric",
              })}
            , but you&rsquo;re checking in today. Update the stop&rsquo;s date to
            today?
          </p>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setShowEarlyPrompt(false)}
              block
            >
              No thanks
            </Button>
            <Button
              type="button"
              variant="primary"
              onClick={handleUpdateDate}
              disabled={setStopStartDate.isPending}
              block
            >
              {setStopStartDate.isPending ? "Updating…" : "Update date"}
            </Button>
          </div>
        </div>
      </Dialog>
    </>
  );
}
