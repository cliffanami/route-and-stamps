"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { PencilSimple, Trash } from "@phosphor-icons/react";
import { Button } from "@/components/ui/Button";
import { DeleteConfirmDialog } from "@/components/ui/DeleteConfirmDialog";
import { MediaSlider } from "./MediaSlider";
import { PhotoUpload } from "./PhotoUpload";
import { EmbedLinkInput } from "./EmbedLinkInput";
import { EditPlaceDetailsForm } from "./EditPlaceDetailsForm";
import { LocationMapLoader } from "@/components/map/LocationMapLoader";
import { OpenInGoogleMapsLink } from "@/components/map/OpenInGoogleMapsLink";
import { usePlace, useDeletePlace } from "@/lib/queries/use-places";

interface PlaceDetailProps {
  tripId: string;
  placeId: string;
}

// places has no provider column — inferred from the hostname of the same
// source_url the embed was fetched for, same providers /api/embed supports.
function inferProvider(
  sourceUrl: string | null,
): "instagram" | "tiktok" | null {
  if (!sourceUrl) return null;
  try {
    const hostname = new URL(sourceUrl).hostname.replace(/^www\./, "");
    if (hostname === "instagram.com") return "instagram";
    if (hostname === "tiktok.com" || hostname === "vm.tiktok.com")
      return "tiktok";
  } catch {
    // fall through
  }
  return null;
}

// View and edit are deliberately distinct screens, not the same layout with
// inputs left visible — view is read-only display, edit gathers every
// editable field: name/location/nearest-stop/note (EditPlaceDetailsForm),
// the link (EmbedLinkInput — kept separate from the details form since it
// also drives the cached oEmbed fetch, not just a plain field update), and
// the photo. Toggled locally rather than a separate route: there's nothing
// else edit needs (no unsaved-draft state to protect on navigation).
export function PlaceDetail({ tripId, placeId }: PlaceDetailProps) {
  const { data: place, isLoading } = usePlace(tripId, placeId);
  const deletePlace = useDeletePlace(tripId);
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  if (isLoading) return <p className="px-6 py-4 text-muted">Loading…</p>;
  if (!place) return <p className="px-6 py-4 text-muted">Place not found.</p>;

  async function handleDelete() {
    setDeleteError(null);
    try {
      await deletePlace.mutateAsync(placeId);
      router.push(`/trips/${tripId}/route`);
    } catch (err) {
      setDeleteError(
        err instanceof Error ? err.message : "Couldn't delete that place — try again.",
      );
    }
  }

  if (editing) {
    return (
      <div className="flex flex-col gap-6 p-6">
        <h1>Edit place</h1>

        <EditPlaceDetailsForm
          tripId={tripId}
          place={place}
          onDone={() => setEditing(false)}
        />

        <div className="flex flex-col gap-2">
          <h2>Media</h2>
          <PhotoUpload tripId={tripId} placeId={placeId} />
          <EmbedLinkInput
            tripId={tripId}
            placeId={placeId}
            initialUrl={place.source_url}
          />
        </div>

        <Button
          type="button"
          variant="secondary"
          onClick={() => setEditing(false)}
        >
          Done
        </Button>

        <Button
          type="button"
          variant="secondary"
          onClick={() => setConfirmingDelete(true)}
        >
          <Trash weight="duotone" size={20} />
          Delete place
        </Button>

        <DeleteConfirmDialog
          open={confirmingDelete}
          onClose={() => setConfirmingDelete(false)}
          onConfirm={handleDelete}
          title="Delete this place?"
          description={`"${place.name}" and everyone's votes on it will be removed. This can't be undone.`}
          pending={deletePlace.isPending}
          error={deleteError}
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 p-6">
      <div className="flex items-start justify-between gap-2">
        <h1>{place.name}</h1>
        <Button
          type="button"
          variant="ghost"
          icon
          onClick={() => setEditing(true)}
          aria-label="Edit place"
        >
          <PencilSimple weight="duotone" size={20} />
        </Button>
      </div>
      {place.town && <p className="text-muted">{place.town}</p>}
      {place.note && <p>{place.note}</p>}

      {place.lat !== null && place.lng !== null && (
        <div className="flex flex-col gap-2">
          <LocationMapLoader lat={place.lat} lng={place.lng} title={place.name} />
          <OpenInGoogleMapsLink lat={place.lat} lng={place.lng} />
        </div>
      )}

      <MediaSlider
        photoPath={place.photo_url}
        embedHtml={place.embed_html}
        provider={inferProvider(place.source_url)}
        sourceUrl={place.source_url}
        placeName={place.name}
      />
    </div>
  );
}
