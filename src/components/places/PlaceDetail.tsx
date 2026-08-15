"use client";

import { useState } from "react";
import { PencilSimple } from "@phosphor-icons/react";
import { Button } from "@/components/ui/Button";
import { MediaSlider } from "./MediaSlider";
import { PhotoUpload } from "./PhotoUpload";
import { EmbedLinkInput } from "./EmbedLinkInput";
import { LocationMapLoader } from "@/components/map/LocationMapLoader";
import { OpenInGoogleMapsLink } from "@/components/map/OpenInGoogleMapsLink";
import { usePlace } from "@/lib/queries/use-places";

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
// inputs left visible — view is read-only display, edit is only the two
// media controls. Toggled locally rather than a separate route: there's
// nothing else edit needs (no unsaved-draft state to protect on navigation).
export function PlaceDetail({ tripId, placeId }: PlaceDetailProps) {
  const { data: place, isLoading } = usePlace(tripId, placeId);
  const [editing, setEditing] = useState(false);

  if (isLoading) return <p className="px-6 py-4 text-muted">Loading…</p>;
  if (!place) return <p className="px-6 py-4 text-muted">Place not found.</p>;

  if (editing) {
    return (
      <div className="flex flex-col gap-4 p-6">
        <h1>Edit media</h1>
        <PhotoUpload tripId={tripId} placeId={placeId} />
        <EmbedLinkInput
          tripId={tripId}
          placeId={placeId}
          initialUrl={place.source_url}
        />
        <Button
          type="button"
          variant="secondary"
          onClick={() => setEditing(false)}
        >
          Done
        </Button>
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
          aria-label="Edit media"
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
