"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import { useUpdateStopLogistics } from "@/lib/queries/use-stops";
import type { Stop, TransportCostStatus } from "@/types/database.types";

interface StopLogisticsFormProps {
  tripId: string;
  stop: Stop;
  // Strict select, same pattern as currency/category (ROADMAP.md Milestone
  // A follow-up) — sourced from the trip's own configured list.
  transportModes: string[];
  onDone: () => void;
}

const FIELDS = [
  { key: "guide_info", label: "Guide" },
  { key: "flight_info", label: "Flight" },
] as const;

const COST_STATUS_OPTIONS: { value: TransportCostStatus; label: string }[] = [
  { value: "included", label: "Included" },
  { value: "own_account", label: "Own account" },
  { value: "check", label: "Check" },
];

// Itinerary-linked logistics (ROADMAP.md M4, extended for Stop Detail's
// Overview tab) — plain free-text fields for most of this; PRD §8 doesn't
// spell out the intended shape beyond "hotel/meals/guide/flight fields on
// stops". accommodation_name is deliberately not here — accommodation is a
// Place tagged is_accommodation, not a stop-level field.
export function StopLogisticsForm({
  tripId,
  stop,
  transportModes,
  onDone,
}: StopLogisticsFormProps) {
  const updateLogistics = useUpdateStopLogistics(tripId);
  const { showToast } = useToast();

  const [values, setValues] = useState({
    guide_info: stop.guide_info ?? "",
    flight_info: stop.flight_info ?? "",
    description: stop.description ?? "",
    transport_detail: stop.transport_detail ?? "",
    departure_point: stop.departure_point ?? "",
    arrival_point: stop.arrival_point ?? "",
  });
  const [transportMode, setTransportMode] = useState(stop.transport_mode ?? "");
  const [transportCostStatus, setTransportCostStatus] = useState<
    TransportCostStatus | ""
  >(stop.transport_cost_status ?? "");
  // datetime-local inputs need "YYYY-MM-DDTHH:mm", not a full ISO string
  // with seconds/timezone — trimmed to the 16 chars that input accepts.
  const [startDate, setStartDate] = useState(stop.start_date ?? "");
  const [endDate, setEndDate] = useState(stop.end_date ?? "");
  const [arrivalTime, setArrivalTime] = useState(
    stop.arrival_time ? stop.arrival_time.slice(0, 16) : "",
  );
  const [error, setError] = useState<string | null>(null);

  // Defensive: keeps a legacy mode not in the trip's current list
  // selectable when editing, same pattern as currency/category selects.
  const transportModeOptions = Array.from(
    new Set([...transportModes, ...(stop.transport_mode ? [stop.transport_mode] : [])]),
  );

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);

    if (startDate && endDate && endDate < startDate) {
      setError("End date can't be before the start date");
      return;
    }

    try {
      await updateLogistics.mutateAsync({
        stopId: stop.id,
        guide_info: values.guide_info.trim() || null,
        flight_info: values.flight_info.trim() || null,
        description: values.description.trim() || null,
        transport_mode: transportMode || null,
        transport_detail: values.transport_detail.trim() || null,
        transport_cost_status: transportCostStatus || null,
        departure_point: values.departure_point.trim() || null,
        arrival_point: values.arrival_point.trim() || null,
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
      <div className="field">
        <label htmlFor="stop-description">Day-by-day notes (optional)</label>
        <textarea
          id="stop-description"
          className="input"
          rows={6}
          value={values.description}
          onChange={(event) =>
            setValues((current) => ({ ...current, description: event.target.value }))
          }
        />
      </div>

      <div className="field">
        <label htmlFor="stop-transport-mode">Arriving by (optional)</label>
        <select
          id="stop-transport-mode"
          className="input"
          value={transportMode}
          onChange={(event) => setTransportMode(event.target.value)}
        >
          <option value="">— Select —</option>
          {transportModeOptions.map((mode) => (
            <option key={mode} value={mode}>
              {mode}
            </option>
          ))}
        </select>
      </div>

      <div className="field">
        <label htmlFor="stop-transport-detail">Transport detail (optional)</label>
        <input
          id="stop-transport-detail"
          className="input"
          placeholder="e.g. Shinkansen then local mountain train"
          value={values.transport_detail}
          onChange={(event) =>
            setValues((current) => ({ ...current, transport_detail: event.target.value }))
          }
        />
      </div>

      <div className="flex gap-2">
        <div className="field flex-1">
          <label htmlFor="stop-departure-point">Departure point (optional)</label>
          <input
            id="stop-departure-point"
            className="input"
            value={values.departure_point}
            onChange={(event) =>
              setValues((current) => ({ ...current, departure_point: event.target.value }))
            }
          />
        </div>
        <div className="field flex-1">
          <label htmlFor="stop-arrival-point">Arrival point (optional)</label>
          <input
            id="stop-arrival-point"
            className="input"
            value={values.arrival_point}
            onChange={(event) =>
              setValues((current) => ({ ...current, arrival_point: event.target.value }))
            }
          />
        </div>
      </div>

      <div className="field">
        <label htmlFor="stop-transport-cost-status">Transport cost (optional)</label>
        <select
          id="stop-transport-cost-status"
          className="input"
          value={transportCostStatus}
          onChange={(event) =>
            setTransportCostStatus(event.target.value as TransportCostStatus | "")
          }
        >
          <option value="">— Select —</option>
          {COST_STATUS_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

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
          max={endDate || undefined}
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
          min={startDate || undefined}
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
