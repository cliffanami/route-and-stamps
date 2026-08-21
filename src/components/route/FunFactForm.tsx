"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import { useAddFunFact } from "@/lib/queries/use-fun-facts";
import type { Place, Stop } from "@/types/database.types";

interface FunFactFormProps {
  tripId: string;
  places: Place[];
  stops: Stop[];
  onDone: () => void;
}

// Mirrors TipForm's shape (ROADMAP.md Milestone F) — text plus an
// optional place/stop link, no format toggle since a fun fact is always
// text (no video-link variant the way tips have).
export function FunFactForm({ tripId, places, stops, onDone }: FunFactFormProps) {
  const addFunFact = useAddFunFact(tripId);
  const { showToast } = useToast();

  const [body, setBody] = useState("");
  const [placeId, setPlaceId] = useState("");
  const [stopId, setStopId] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);

    if (!body.trim()) {
      setError("A fact needs some text");
      return;
    }

    try {
      await addFunFact.mutateAsync({
        body,
        place_id: placeId || null,
        stop_id: stopId || null,
      });
      showToast("Fact added");
      onDone();
    } catch {
      setError("Couldn't save that fact — try again.");
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="field">
        <label htmlFor="fun-fact-body">Fact</label>
        <textarea
          id="fun-fact-body"
          className="input"
          rows={4}
          value={body}
          onChange={(event) => setBody(event.target.value)}
        />
      </div>

      <div className="field">
        <label htmlFor="fun-fact-place">Link to a place (optional)</label>
        <select
          id="fun-fact-place"
          className="input"
          value={placeId}
          onChange={(event) => setPlaceId(event.target.value)}
        >
          <option value="">— None —</option>
          {places.map((place) => (
            <option key={place.id} value={place.id}>
              {place.name}
            </option>
          ))}
        </select>
      </div>

      <div className="field">
        <label htmlFor="fun-fact-stop">Link to a stop (optional)</label>
        <select
          id="fun-fact-stop"
          className="input"
          value={stopId}
          onChange={(event) => setStopId(event.target.value)}
        >
          <option value="">— None —</option>
          {stops.map((stop) => (
            <option key={stop.id} value={stop.id}>
              {stop.name}
            </option>
          ))}
        </select>
      </div>

      {error && <p className="text-muted">{error}</p>}

      <Button type="submit" variant="primary" disabled={addFunFact.isPending}>
        {addFunFact.isPending ? "Saving…" : "Save fact"}
      </Button>
    </form>
  );
}
