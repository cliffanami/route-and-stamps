"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { useSetPlaceDate } from "@/lib/queries/use-places";
import type { Place } from "@/types/database.types";

interface MustGoDatePromptProps {
  tripId: string;
  place: Place | null;
  onClose: () => void;
}

// Fires once, at the moment a place's votes transition from not-mutual to
// mutual "must go" (ROADMAP.md Milestone W) — the first auto-triggered
// Dialog in the app, opened as a mutation side effect rather than a button
// click (see PlaceRow's onMustGoConsensus). Skipping just closes the dialog
// with no mutation — the date stays optional either way, this is a nudge
// at the moment agreement is reached, not a requirement enforced elsewhere.
export function MustGoDatePrompt({ tripId, place, onClose }: MustGoDatePromptProps) {
  const setPlaceDate = useSetPlaceDate(tripId);
  const [date, setDate] = useState("");

  async function handleSave() {
    if (!place || !date) return;
    await setPlaceDate.mutateAsync({ placeId: place.id, date });
    setDate("");
    onClose();
  }

  function handleClose() {
    setDate("");
    onClose();
  }

  return (
    <Dialog
      open={place !== null}
      onClose={handleClose}
      title="When do you want to go?"
    >
      <div className="flex flex-col gap-4">
        {place && (
          <p className="text-muted">
            Both of you marked <strong>{place.name}</strong> as a must-go —
            pick a date, or skip for now.
          </p>
        )}
        <div className="field">
          <label htmlFor="must-go-date">Date</label>
          <input
            id="must-go-date"
            type="date"
            className="input"
            value={date}
            onChange={(event) => setDate(event.target.value)}
          />
        </div>
        <div className="flex gap-2">
          <Button
            type="button"
            variant="secondary"
            onClick={handleClose}
            block
          >
            Skip
          </Button>
          <Button
            type="button"
            variant="primary"
            onClick={handleSave}
            disabled={!date || setPlaceDate.isPending}
            block
          >
            {setPlaceDate.isPending ? "Saving…" : "Save date"}
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
