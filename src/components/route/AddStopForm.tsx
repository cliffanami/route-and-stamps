"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
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
  name: z.string().trim().min(1, "Name is required").max(200),
  date_label: z.string().trim().max(100).optional().or(z.literal("")),
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
    getValues,
    setError,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<DetailsValues>({ resolver: zodResolver(detailsSchema) });

  const [geocoding, setGeocoding] = useState(false);
  const [locateError, setLocateError] = useState<string | null>(null);
  const [located, setLocated] = useState<Located | null>(null);

  async function handleLocate() {
    const name = getValues("name");
    if (!name?.trim()) {
      setError("name", { message: "Enter a name first" });
      return;
    }

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
    if (!located) return;

    try {
      await addStop.mutateAsync({
        name: values.name,
        date_label: values.date_label || null,
        lat: located.lat,
        lng: located.lng,
        town: located.town,
      });
      showToast("Stop added");
      reset();
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
      <div className="field">
        <label htmlFor="stop-name">Name</label>
        <input id="stop-name" className="input" {...register("name")} />
        {errors.name && <p className="text-muted">{errors.name.message}</p>}
      </div>

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
        <label htmlFor="stop-date-label">Date (optional)</label>
        <input
          id="stop-date-label"
          className="input"
          placeholder="e.g. Aug 20–23"
          {...register("date_label")}
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
