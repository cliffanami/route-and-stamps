"use client";

import { useState } from "react";
import { PencilSimple } from "@phosphor-icons/react";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import { useUpdateTripDetails } from "@/lib/queries/use-trip";
import type { Trip } from "@/types/database.types";

interface TripDetailsFormProps {
  tripId: string;
  trip: Trip;
}

// Read-only by default, same edit-mode-toggle convention as
// PlaceDetail/StopDetail — a saved form shouldn't stay sitting open as
// editable fields.
export function TripDetailsForm({ tripId, trip }: TripDetailsFormProps) {
  const [editing, setEditing] = useState(false);

  if (!editing) {
    return (
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <h2>{trip.name}</h2>
          <Button
            type="button"
            variant="ghost"
            icon
            onClick={() => setEditing(true)}
            aria-label="Edit trip details"
          >
            <PencilSimple weight="duotone" size={20} />
          </Button>
        </div>
        {trip.description && <p>{trip.description}</p>}
        {(trip.start_date || trip.end_date) && (
          <p className="text-muted">
            {trip.start_date ?? "—"} to {trip.end_date ?? "—"}
          </p>
        )}
      </div>
    );
  }

  return (
    <EditTripDetailsForm
      tripId={tripId}
      trip={trip}
      onDone={() => setEditing(false)}
    />
  );
}

// Name/description/date-range (ROADMAP.md Milestone A) — start_date/end_date
// already existed on `trips` (0001_init.sql) but had no UI until now;
// description is the one genuinely new field. Reuses the plain date-input
// pattern StopLogisticsForm already established for Milestone D.
function EditTripDetailsForm({
  tripId,
  trip,
  onDone,
}: TripDetailsFormProps & { onDone: () => void }) {
  const updateDetails = useUpdateTripDetails(tripId);
  const { showToast } = useToast();

  const [name, setName] = useState(trip.name);
  const [description, setDescription] = useState(trip.description ?? "");
  const [startDate, setStartDate] = useState(trip.start_date ?? "");
  const [endDate, setEndDate] = useState(trip.end_date ?? "");
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError("Trip name is required");
      return;
    }
    if (startDate && endDate && endDate < startDate) {
      setError("End date can't be before the start date");
      return;
    }

    try {
      await updateDetails.mutateAsync({
        name,
        description: description.trim() || null,
        start_date: startDate || null,
        end_date: endDate || null,
      });
      showToast("Trip details saved");
      onDone();
    } catch {
      setError("Couldn't save trip details — try again.");
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="field">
        <label htmlFor="trip-name">Trip name</label>
        <input
          id="trip-name"
          className="input"
          value={name}
          onChange={(event) => setName(event.target.value)}
        />
      </div>

      <div className="field">
        <label htmlFor="trip-description">Description (optional)</label>
        <textarea
          id="trip-description"
          className="input"
          value={description}
          onChange={(event) => setDescription(event.target.value)}
        />
      </div>

      <div className="field">
        <label htmlFor="trip-start-date">Start date (optional)</label>
        <input
          id="trip-start-date"
          type="date"
          className="input"
          value={startDate}
          max={endDate || undefined}
          onChange={(event) => setStartDate(event.target.value)}
        />
      </div>

      <div className="field">
        <label htmlFor="trip-end-date">End date (optional)</label>
        <input
          id="trip-end-date"
          type="date"
          className="input"
          value={endDate}
          min={startDate || undefined}
          onChange={(event) => setEndDate(event.target.value)}
        />
      </div>

      {error && <p className="text-muted">{error}</p>}

      <div className="flex gap-2">
        <Button type="submit" variant="primary" disabled={updateDetails.isPending}>
          {updateDetails.isPending ? "Saving…" : "Save trip details"}
        </Button>
        <Button type="button" variant="secondary" onClick={onDone}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
