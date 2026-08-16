"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import {
  LocationSearchField,
  type LocationSearchResult,
} from "@/components/places/LocationSearchField";
import { useAddStop } from "@/lib/queries/use-stops";

type GeocodeResult = { lat: number; lng: number; town: string | null };

// Same Nominatim search PlaceForm already uses (ARCHITECTURE.md §1c Tier
// 1) — no Tier 2/duplicate-nudge here, since a stop is a rare, deliberate
// add, not the high-frequency flow those exist for.
async function geocode(query: string): Promise<GeocodeResult | null> {
  const res = await fetch(`/api/geocode?q=${encodeURIComponent(query)}`);
  const body = await res.json();
  if (!res.ok)
    throw new Error(body.error?.message ?? "Couldn't search for that.");
  return (body.results[0] as GeocodeResult | undefined) ?? null;
}

const detailsSchema = z.object({
  start_date: z.string().optional().or(z.literal("")),
  end_date: z.string().optional().or(z.literal("")),
});

type DetailsValues = z.infer<typeof detailsSchema>;

interface Located {
  lat: number;
  lng: number;
  town: string | null;
}

interface AddStopFormProps {
  tripId: string;
  onDone: () => void;
}

export function AddStopForm({ tripId, onDone }: AddStopFormProps) {
  const addStop = useAddStop(tripId);
  const { showToast } = useToast();
  const {
    register,
    handleSubmit,
    reset,
    formState: { isSubmitting },
  } = useForm<DetailsValues>({ resolver: zodResolver(detailsSchema) });

  const [name, setName] = useState("");
  const [nameError, setNameError] = useState<string | null>(null);
  const [geocoding, setGeocoding] = useState(false);
  const [locateError, setLocateError] = useState<string | null>(null);
  const [located, setLocated] = useState<Located | null>(null);

  function handleSearchSelect(result: LocationSearchResult) {
    setName(result.label.split(",")[0].trim());
    setLocateError(null);
    setLocated({ lat: result.lat, lng: result.lng, town: result.town });
  }

  async function handleLocate() {
    if (!name.trim()) {
      setNameError("Enter a name first");
      return;
    }
    setNameError(null);

    setGeocoding(true);
    setLocateError(null);

    try {
      const top = await geocode(name);
      if (!top) {
        setLocateError("No location found for that name.");
        setLocated(null);
        return;
      }

      const reverseRes = await fetch(
        `/api/reverse-geocode?lat=${top.lat}&lng=${top.lng}`,
      );
      const town = reverseRes.ok
        ? ((await reverseRes.json()).town as string | null)
        : top.town;

      setLocated({ lat: top.lat, lng: top.lng, town });
    } catch (err) {
      setLocateError(
        err instanceof Error ? err.message : "Something went wrong.",
      );
    } finally {
      setGeocoding(false);
    }
  }

  async function onSubmit(values: DetailsValues) {
    if (!name.trim()) {
      setNameError("Enter a name first");
      return;
    }
    if (!located) return;

    try {
      await addStop.mutateAsync({
        name,
        start_date: values.start_date || null,
        end_date: values.end_date || null,
        lat: located.lat,
        lng: located.lng,
        town: located.town,
      });
      showToast("Stop added");
      reset();
      setName("");
      setLocated(null);
      onDone();
    } catch (err) {
      setLocateError(
        err instanceof Error ? err.message : "Couldn't add that stop — try again.",
      );
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
      <LocationSearchField
        id="stop-name"
        label="Name"
        value={name}
        onChange={(value) => {
          setName(value);
          setNameError(null);
        }}
        onSelect={handleSearchSelect}
        placeholder="Start typing a town or city…"
        required
      />
      {nameError && <p className="text-muted">{nameError}</p>}

      <Button
        type="button"
        variant="secondary"
        onClick={handleLocate}
        disabled={geocoding}
      >
        {geocoding ? "Finding…" : "Find location"}
      </Button>
      {locateError && <p className="text-muted">{locateError}</p>}
      {located?.town && <p className="text-muted">Located in {located.town}</p>}

      <div className="field">
        <label htmlFor="stop-start-date">Start date (optional)</label>
        <input
          id="stop-start-date"
          type="date"
          className="input"
          {...register("start_date")}
        />
      </div>

      <div className="field">
        <label htmlFor="stop-end-date">End date (optional)</label>
        <input
          id="stop-end-date"
          type="date"
          className="input"
          {...register("end_date")}
        />
      </div>

      <Button
        type="submit"
        variant="primary"
        disabled={!located || isSubmitting || addStop.isPending}
      >
        {addStop.isPending ? "Saving…" : "Add stop"}
      </Button>
    </form>
  );
}
