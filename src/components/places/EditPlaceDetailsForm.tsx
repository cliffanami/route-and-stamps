"use client";

import { useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/Button";
import { RichTextEditor } from "@/components/ui/RichTextEditor";
import { useToast } from "@/components/ui/Toast";
import {
  LocationSearchField,
  type LocationSearchResult,
} from "./LocationSearchField";
import { MealTagPicker } from "./MealTagPicker";
import { AccommodationToggle } from "./AccommodationToggle";
import { useStops } from "@/lib/queries/use-stops";
import { useUpdatePlace } from "@/lib/queries/use-places";
import { nearestStop } from "@/lib/geo/nearest-stop";
import type { MealTag, Place } from "@/types/database.types";

const noteSchema = z.object({
  note: z.string().trim().max(2000).optional().or(z.literal("")),
});

type NoteValues = z.infer<typeof noteSchema>;

interface Located {
  lat: number;
  lng: number;
  town: string | null;
}

interface EditPlaceDetailsFormProps {
  tripId: string;
  place: Place;
  onDone: () => void;
}

// Everything the Add-a-Place form collects except the link (source_url
// stays EmbedLinkInput's job, edited alongside this in PlaceDetail's edit
// screen — see updatePlaceSchema's comment for why). Reuses the exact same
// LocationSearchField + nearest-stop pattern as PlaceForm, prefilled from
// the place being edited instead of starting blank.
export function EditPlaceDetailsForm({
  tripId,
  place,
  onDone,
}: EditPlaceDetailsFormProps) {
  const { data: stops = [] } = useStops(tripId);
  const updatePlace = useUpdatePlace(tripId);
  const { showToast } = useToast();
  const {
    handleSubmit,
    control,
    formState: { isSubmitting },
  } = useForm<NoteValues>({
    resolver: zodResolver(noteSchema),
    defaultValues: { note: place.note ?? "" },
  });

  const [name, setName] = useState(place.name);
  const [nameError, setNameError] = useState<string | null>(null);
  const [located, setLocated] = useState<Located | null>(
    place.lat !== null && place.lng !== null
      ? { lat: place.lat, lng: place.lng, town: place.town }
      : null,
  );
  const [stopId, setStopId] = useState(place.nearest_stop_id ?? "");
  const [mealTags, setMealTags] = useState<MealTag[]>(place.meal_tags);
  const [isAccommodation, setIsAccommodation] = useState(place.is_accommodation);
  const [error, setError] = useState<string | null>(null);

  async function handleSearchSelect(result: LocationSearchResult) {
    setName(result.label.split(",")[0].trim());
    setError(null);
    try {
      const reverseRes = await fetch(
        `/api/reverse-geocode?lat=${result.lat}&lng=${result.lng}`,
      );
      const town = reverseRes.ok
        ? ((await reverseRes.json()).town as string | null)
        : result.town;

      setLocated({ lat: result.lat, lng: result.lng, town });
      setStopId(nearestStop(result.lat, result.lng, stops)?.id ?? "");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    }
  }

  async function onSubmit(values: NoteValues) {
    if (!name.trim()) {
      setNameError("Enter a name first");
      return;
    }

    try {
      await updatePlace.mutateAsync({
        placeId: place.id,
        name,
        note: values.note || null,
        lat: located?.lat ?? null,
        lng: located?.lng ?? null,
        town: located?.town ?? null,
        nearest_stop_id: stopId || null,
        meal_tags: mealTags,
        is_accommodation: isAccommodation,
      });
      showToast("Place updated");
      onDone();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Couldn't save changes — try again.",
      );
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
      <LocationSearchField
        id="edit-place-name"
        label="Name"
        value={name}
        onChange={(value) => {
          setName(value);
          setNameError(null);
        }}
        onSelect={handleSearchSelect}
        required
      />
      {nameError && <p className="text-muted">{nameError}</p>}

      {stops.length > 0 && (
        <div className="field">
          <label htmlFor="edit-place-stop">Nearest stop</label>
          <select
            id="edit-place-stop"
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

      <MealTagPicker value={mealTags} onChange={setMealTags} />
      <AccommodationToggle checked={isAccommodation} onChange={setIsAccommodation} />

      <div className="field">
        <label htmlFor="edit-place-note">Note (optional)</label>
        <Controller
          name="note"
          control={control}
          render={({ field }) => (
            <RichTextEditor id="edit-place-note" value={field.value ?? ""} onChange={field.onChange} />
          )}
        />
      </div>

      {error && <p className="text-muted">{error}</p>}

      <Button
        type="submit"
        variant="primary"
        disabled={isSubmitting || updatePlace.isPending}
      >
        {updatePlace.isPending ? "Saving…" : "Save changes"}
      </Button>
    </form>
  );
}
