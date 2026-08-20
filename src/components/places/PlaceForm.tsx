"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/Button";
import { DuplicateNudge } from "./DuplicateNudge";
import {
  LocationSearchField,
  type LocationSearchResult,
} from "./LocationSearchField";
import { useStops } from "@/lib/queries/use-stops";
import { useAddPlace, findNearbyPlaces } from "@/lib/queries/use-places";
import { nearestStop } from "@/lib/geo/nearest-stop";
import { parsePlaceMention } from "@/lib/geo/parse-place-mention";
import type { Place } from "@/types/database.types";

type GeocodeResult = { lat: number; lng: number; town: string | null };

// Tier 1 of M1.5's cascading place-name resolution (ARCHITECTURE.md §1c) —
// hands a cleaned query to the existing Nominatim Route Handler, whose
// contract is unchanged. Returns the top result only; no new endpoint.
async function geocode(query: string): Promise<GeocodeResult | null> {
  const res = await fetch(`/api/geocode?q=${encodeURIComponent(query)}`);
  const body = await res.json();
  if (!res.ok)
    throw new Error(body.error?.message ?? "Couldn't search for that.");
  return (body.results[0] as GeocodeResult | undefined) ?? null;
}

const detailsSchema = z.object({
  source_url: z
    .string()
    .trim()
    .url("Must be a valid URL")
    .optional()
    .or(z.literal("")),
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
  // Web Share Target lands here (ROADMAP.md Milestone B) — pre-fills the
  // link field only, same as a manual paste. No oEmbed fetch triggered;
  // that only ever happens later via the separate edit-mode EmbedLinkInput
  // flow, matching this form's existing behavior for a typed-in link.
  initialSourceUrl?: string;
}

export function PlaceForm({ tripId, initialSourceUrl }: PlaceFormProps) {
  const { data: stops = [] } = useStops(tripId);
  const addPlace = useAddPlace(tripId);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<DetailsValues>({
    resolver: zodResolver(detailsSchema),
    defaultValues: { source_url: initialSourceUrl ?? "" },
  });

  const [name, setName] = useState("");
  const [nameError, setNameError] = useState<string | null>(null);
  const [geocoding, setGeocoding] = useState(false);
  const [locateError, setLocateError] = useState<string | null>(null);
  const [located, setLocated] = useState<Located | null>(null);
  const [stopId, setStopId] = useState("");
  const [duplicates, setDuplicates] = useState<Place[]>([]);

  // Shared by both the live-search dropdown and the explicit "Find
  // location" button below it — same "found a coordinate" tail: refine
  // the town via reverse-geocode, auto-assign the nearest stop, and check
  // for existing nearby places, regardless of which path got us here.
  async function applyLocatedResult(result: { lat: number; lng: number; town: string | null }) {
    const reverseRes = await fetch(
      `/api/reverse-geocode?lat=${result.lat}&lng=${result.lng}`,
    );
    const town = reverseRes.ok
      ? ((await reverseRes.json()).town as string | null)
      : result.town;

    setLocated({ lat: result.lat, lng: result.lng, town });
    setStopId(nearestStop(result.lat, result.lng, stops)?.id ?? "");
    setDuplicates(await findNearbyPlaces(tripId, result.lat, result.lng));
  }

  // Selecting a live-search suggestion is disambiguation (ARCHITECTURE.md
  // §1c flagged the lack of this UI) — the matched place's own short name
  // replaces whatever was typed, same as picking a result in any address
  // autocomplete.
  async function handleSearchSelect(result: LocationSearchResult) {
    setName(result.label.split(",")[0].trim());
    setLocateError(null);
    setDuplicates([]);
    try {
      await applyLocatedResult(result);
    } catch (err) {
      setLocateError(
        err instanceof Error ? err.message : "Something went wrong.",
      );
    }
  }

  async function handleLocate() {
    if (!name.trim()) {
      setNameError("Enter a name first");
      return;
    }
    setNameError(null);

    setGeocoding(true);
    setLocateError(null);
    setDuplicates([]);

    try {
      // Tier 1: strip narrative filler / reformat "X in Y" before the
      // existing Nominatim call — the call itself is unchanged.
      const { query } = parsePlaceMention(name);
      let top = await geocode(query);

      // Tier 2 (optional, gated): only on a zero-result Tier 1 miss. Any
      // failure here — disabled, unconfigured, timeout, upstream error —
      // is caught and treated the same as "no extraction available".
      if (!top) {
        try {
          const extractRes = await fetch("/api/extract-place", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ text: name }),
          });
          if (extractRes.ok) {
            const { query: extractedQuery } = (await extractRes.json()) as {
              query: string;
            };
            top = await geocode(extractedQuery);
          }
        } catch {
          // Graceful fallback — Tier 2 failures never block adding a place.
        }
      }

      if (!top) {
        setLocateError(
          "No location found for that name — you can still save without a pin.",
        );
        setLocated(null);
        return;
      }

      await applyLocatedResult(top);
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

    await addPlace.mutateAsync({
      name,
      source_url: values.source_url || null,
      note: values.note || null,
      lat: located?.lat ?? null,
      lng: located?.lng ?? null,
      town: located?.town ?? null,
      nearest_stop_id: stopId || null,
    });
    reset();
    setName("");
    setLocated(null);
    setStopId("");
    setDuplicates([]);
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4 p-6">
      <LocationSearchField
        id="name"
        label="Name"
        value={name}
        onChange={(value) => {
          setName(value);
          setNameError(null);
        }}
        onSelect={handleSearchSelect}
        placeholder="Start typing a place or town…"
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
          {located?.town && (
            <p className="text-muted">Located in {located.town}</p>
          )}
        </div>
      )}

      <DuplicateNudge places={duplicates} />

      <div className="field">
        <label htmlFor="source_url">Link (optional)</label>
        <input id="source_url" className="input" {...register("source_url")} />
        {errors.source_url && (
          <p className="text-muted">{errors.source_url.message}</p>
        )}
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
