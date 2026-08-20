"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import { useUpdateStopLogistics } from "@/lib/queries/use-stops";
import type { Stop } from "@/types/database.types";

interface StopLogisticsFormProps {
  tripId: string;
  stop: Stop;
  onDone: () => void;
}

const FIELDS = [
  { key: "hotel_info", label: "Hotel" },
  { key: "guide_info", label: "Guide" },
  { key: "flight_info", label: "Flight" },
] as const;

// Itinerary-linked logistics (ROADMAP.md M4) — plain free-text fields, not
// a structured booking model; PRD §8 doesn't spell out the intended shape
// beyond "hotel/meals/guide/flight fields on stops".
export function StopLogisticsForm({
  tripId,
  stop,
  onDone,
}: StopLogisticsFormProps) {
  const updateLogistics = useUpdateStopLogistics(tripId);
  const { showToast } = useToast();

  const [values, setValues] = useState({
    hotel_info: stop.hotel_info ?? "",
    guide_info: stop.guide_info ?? "",
    flight_info: stop.flight_info ?? "",
  });
  // datetime-local inputs need "YYYY-MM-DDTHH:mm", not a full ISO string
  // with seconds/timezone — trimmed to the 16 chars that input accepts.
  const [startDate, setStartDate] = useState(stop.start_date ?? "");
  const [endDate, setEndDate] = useState(stop.end_date ?? "");
  const [arrivalTime, setArrivalTime] = useState(
    stop.arrival_time ? stop.arrival_time.slice(0, 16) : "",
  );
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);

    try {
      await updateLogistics.mutateAsync({
        stopId: stop.id,
        hotel_info: values.hotel_info.trim() || null,
        guide_info: values.guide_info.trim() || null,
        flight_info: values.flight_info.trim() || null,
        start_date: startDate || null,
        end_date: endDate || null,
        arrival_time: arrivalTime ? new Date(arrivalTime).toISOString() : null,
      });
      showToast("Logistics saved");
      onDone();
    } catch {
      setError("Couldn't save that — try again.");
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      {FIELDS.map(({ key, label }) => (
        <div className="field" key={key}>
          <label htmlFor={`stop-${key}`}>{label}</label>
          <input
            id={`stop-${key}`}
            className="input"
            value={values[key]}
            onChange={(event) =>
              setValues((current) => ({
                ...current,
                [key]: event.target.value,
              }))
            }
          />
        </div>
      ))}

      <div className="field">
        <label htmlFor="stop-start-date">Start date (optional)</label>
        <input
          id="stop-start-date"
          type="date"
          className="input"
          value={startDate}
          onChange={(event) => setStartDate(event.target.value)}
        />
      </div>

      <div className="field">
        <label htmlFor="stop-end-date">End date (optional)</label>
        <input
          id="stop-end-date"
          type="date"
          className="input"
          value={endDate}
          onChange={(event) => setEndDate(event.target.value)}
        />
      </div>

      <div className="field">
        <label htmlFor="stop-arrival-time">
          Scheduled arrival (optional, e.g. flight landing time)
        </label>
        <input
          id="stop-arrival-time"
          type="datetime-local"
          className="input"
          value={arrivalTime}
          onChange={(event) => setArrivalTime(event.target.value)}
        />
      </div>

      {error && <p className="text-muted">{error}</p>}

      <Button
        type="submit"
        variant="primary"
        disabled={updateLogistics.isPending}
      >
        {updateLogistics.isPending ? "Saving…" : "Save"}
      </Button>
    </form>
  );
}
