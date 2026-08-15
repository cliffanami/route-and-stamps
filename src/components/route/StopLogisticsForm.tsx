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
  { key: "meals_info", label: "Meals" },
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
    meals_info: stop.meals_info ?? "",
    guide_info: stop.guide_info ?? "",
    flight_info: stop.flight_info ?? "",
  });
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);

    try {
      await updateLogistics.mutateAsync({
        stopId: stop.id,
        hotel_info: values.hotel_info.trim() || null,
        meals_info: values.meals_info.trim() || null,
        guide_info: values.guide_info.trim() || null,
        flight_info: values.flight_info.trim() || null,
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
