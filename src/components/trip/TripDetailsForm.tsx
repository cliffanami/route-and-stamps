"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import { useUpdateTripDetails } from "@/lib/queries/use-trip";
import type { Trip } from "@/types/database.types";

interface TripDetailsFormProps {
  tripId: string;
  trip: Trip;
}

// Name/description/date-range (ROADMAP.md Milestone A) — start_date/end_date
// already existed on `trips` (0001_init.sql) but had no UI until now;
// description is the one genuinely new field. Reuses the plain date-input
// pattern StopLogisticsForm already established for Milestone D.
export function TripDetailsForm({ tripId, trip }: TripDetailsFormProps) {
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
          onChange={(event) => setEndDate(event.target.value)}
        />
      </div>

      {error && <p className="text-muted">{error}</p>}

      <Button type="submit" variant="primary" disabled={updateDetails.isPending}>
        {updateDetails.isPending ? "Saving…" : "Save trip details"}
      </Button>
    </form>
  );
}
