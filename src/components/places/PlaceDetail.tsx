"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { PencilSimple, Trash, Wallet } from "@phosphor-icons/react";
import { Button } from "@/components/ui/Button";
import { Tag } from "@/components/ui/Tag";
import { Dialog } from "@/components/ui/Dialog";
import { DeleteConfirmDialog } from "@/components/ui/DeleteConfirmDialog";
import { MediaSlider } from "./MediaSlider";
import { PhotoUpload } from "./PhotoUpload";
import { EmbedLinkInput } from "./EmbedLinkInput";
import { EditPlaceDetailsForm } from "./EditPlaceDetailsForm";
import { VoteScale, VOTE_LEVEL_LABEL } from "./VoteScale";
import { MEAL_TAG_LABEL } from "./MealTagPicker";
import { LocationMapLoader } from "@/components/map/LocationMapLoader";
import { OpenInGoogleMapsLink } from "@/components/map/OpenInGoogleMapsLink";
import { BudgetForm } from "@/components/budget/BudgetForm";
import { usePlace, useDeletePlace } from "@/lib/queries/use-places";
import { useVotes, useCastVote } from "@/lib/queries/use-votes";
import { useTripMembers } from "@/lib/queries/use-trip-members";
import { useCurrentUserId } from "@/lib/queries/use-current-user";
import { useBudgetLines } from "@/lib/queries/use-budget-lines";
import { formatMinor } from "@/lib/money/currency";
import { isMutualMustGo } from "@/components/route/PlaceRow";

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
  const [addingCost, setAddingCost] = useState(false);

  // Vote + proposer (ROADMAP.md Milestone B) — the same pattern PlaceRow
  // already shows on the Route page, ported here since this dedicated page
  // had none of it. currentUserId/votes/members are independent fetches;
  // PlaceRow gets these as props from RouteSpine, which this page has no
  // equivalent of.
  const currentUserId = useCurrentUserId();
  const { data: votes = [] } = useVotes(tripId);
  const { data: members = [] } = useTripMembers(tripId);
  const castVote = useCastVote(tripId);
  const { data: budgetLines = [] } = useBudgetLines(tripId);

  if (isLoading) return <p className="px-6 py-4 text-muted">Loading…</p>;
  if (!place) return <p className="px-6 py-4 text-muted">Place not found.</p>;

  const placeVotes = votes.filter((v) => v.place_id === placeId);
  const myVote = placeVotes.find((v) => v.user_id === currentUserId)?.level ?? null;
  const memberIds = members.map((m) => m.user_id);
  const consensus = isMutualMustGo(placeVotes, memberIds);
  const otherVotes = members
    .filter((m) => m.user_id !== currentUserId)
    .map((m) => ({
      member: m,
      level: placeVotes.find((v) => v.user_id === m.user_id)?.level,
    }))
    .filter((entry) => entry.level !== undefined);
  const proposedBy = members.find((m) => m.user_id === place.added_by)?.displayName;
  const placeCosts = budgetLines.filter((line) => line.place_id === placeId);

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
      {proposedBy && <p className="text-muted">Proposed by {proposedBy}</p>}
      {place.note && <p>{place.note}</p>}

      {consensus && <Tag variant="accent">Mutual must go</Tag>}
      {place.meal_tags.length > 0 && (
        <div className="flex flex-row gap-2">
          {place.meal_tags.map((tag) => (
            <Tag key={tag} variant="neutral">
              {MEAL_TAG_LABEL[tag]}
            </Tag>
          ))}
        </div>
      )}
      <VoteScale
        value={myVote}
        onChange={(level) => castVote.mutate({ placeId, level })}
        disabled={!currentUserId}
      />
      {otherVotes.length > 0 && (
        <p className="text-muted">
          {otherVotes
            .map((entry) => `${entry.member.displayName}: ${VOTE_LEVEL_LABEL[entry.level!]}`)
            .join(" · ")}
        </p>
      )}

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

      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between gap-2">
          <h2>Costs</h2>
          <Button type="button" variant="secondary" onClick={() => setAddingCost(true)}>
            <Wallet weight="duotone" size={18} />
            Add a cost
          </Button>
        </div>
        {placeCosts.length === 0 ? (
          <p className="text-muted">No costs logged for this place yet.</p>
        ) : (
          placeCosts.map((line) => (
            <p key={line.id}>
              {line.description} — {formatMinor(line.amount_minor, line.currency)}
            </p>
          ))
        )}
      </div>

      <Dialog
        open={addingCost}
        onClose={() => setAddingCost(false)}
        title="Add a cost"
      >
        <BudgetForm
          tripId={tripId}
          existingCategories={Array.from(new Set(budgetLines.map((l) => l.category)))}
          initialValues={{ place_id: placeId, description: place.name }}
          onDone={() => setAddingCost(false)}
        />
      </Dialog>
    </div>
  );
}
