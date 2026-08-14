"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/Button";
import { DuplicateNudge } from "./DuplicateNudge";
import { useStops } from "@/lib/queries/use-stops";
import { useAddPlace, findNearbyPlaces } from "@/lib/queries/use-places";
import { nearestStop } from "@/lib/geo/nearest-stop";
import type { Place } from "@/types/database.types";

const detailsSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(200),
  source_url: z.string().trim().url("Must be a valid URL").optional().or(z.literal("")),
  note: z.string().trim().max(2000).optional().or(z.literal("")),
});

type DetailsValues = z.infer<typeof detailsSchema>;

interface Located {
  lat: number;
  lng: number;
  town: string | null;
}

interface PlaceFormProps {
  tripId: string;
}

export function PlaceForm({ tripId }: PlaceFormProps) {
  const { data: stops = [] } = useStops(tripId);
  const addPlace = useAddPlace(tripId);
  const {
    register,
    handleSubmit,
    getValues,
    setError,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<DetailsValues>({ resolver: zodResolver(detailsSchema) });

  const [geocoding, setGeocoding] = useState(false);
  const [locateError, setLocateError] = useState<string | null>(null);
  const [located, setLocated] = useState<Located | null>(null);
  const [stopId, setStopId] = useState("");
  const [duplicates, setDuplicates] = useState<Place[]>([]);

  async function handleLocate() {
    const name = getValues("name");
    if (!name?.trim()) {
      setError("name", { message: "Enter a name first" });
      return;
    }

    setGeocoding(true);
    setLocateError(null);
    setDuplicates([]);

    try {
      const geocodeRes = await fetch(`/api/geocode?q=${encodeURIComponent(name)}`);
      const geocodeBody = await geocodeRes.json();
      if (!geocodeRes.ok) {
        throw new Error(geocodeBody.error?.message ?? "Couldn't search for that.");
      }

      const top = geocodeBody.results[0] as { lat: number; lng: number; town: string | null } | undefined;
      if (!top) {
        setLocateError("No location found for that name — you can still save without a pin.");
        setLocated(null);
        return;
      }

      const reverseRes = await fetch(`/api/reverse-geocode?lat=${top.lat}&lng=${top.lng}`);
      const town = reverseRes.ok ? ((await reverseRes.json()).town as string | null) : top.town;

      setLocated({ lat: top.lat, lng: top.lng, town });
      setStopId(nearestStop(top.lat, top.lng, stops)?.id ?? "");
      setDuplicates(await findNearbyPlaces(tripId, top.lat, top.lng));
    } catch (err) {
      setLocateError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setGeocoding(false);
    }
  }

  async function onSubmit(values: DetailsValues) {
    await addPlace.mutateAsync({
      name: values.name,
      source_url: values.source_url || null,
      note: values.note || null,
      lat: located?.lat ?? null,
      lng: located?.lng ?? null,
      town: located?.town ?? null,
      nearest_stop_id: stopId || null,
    });
    reset();
    setLocated(null);
    setStopId("");
    setDuplicates([]);
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4 p-6">
      <div className="field">
        <label htmlFor="name">Name</label>
        <input id="name" className="input" {...register("name")} />
        {errors.name && <p className="text-muted">{errors.name.message}</p>}
      </div>

      <Button type="button" variant="secondary" onClick={handleLocate} disabled={geocoding}>
        {geocoding ? "Finding…" : "Find location"}
      </Button>
      {locateError && <p className="text-muted">{locateError}</p>}

      {stops.length > 0 && (
        <div className="field">
          <label htmlFor="stop">Nearest stop</label>
          {/* Always available, not gated on a successful geocode — this is
              the manual fallback ROADMAP.md M1 calls for, so it has to work
              precisely when auto-assignment can't (e.g. no geocode match). */}
          <select
            id="stop"
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
          {located?.town && <p className="text-muted">Located in {located.town}</p>}
        </div>
      )}

      <DuplicateNudge places={duplicates} />

      <div className="field">
        <label htmlFor="source_url">Link (optional)</label>
        <input id="source_url" className="input" {...register("source_url")} />
        {errors.source_url && <p className="text-muted">{errors.source_url.message}</p>}
      </div>

      <div className="field">
        <label htmlFor="note">Note (optional)</label>
        <textarea id="note" className="input" {...register("note")} />
      </div>

      <Button type="submit" variant="primary" disabled={isSubmitting}>
        Save place
      </Button>
    </form>
  );
}
