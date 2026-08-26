"use client";

import { useMemo, useState } from "react";
import { PencilSimple, Trash } from "@phosphor-icons/react";
import { Button } from "@/components/ui/Button";
import { Card, CardMeta } from "@/components/ui/Card";
import { Tag } from "@/components/ui/Tag";
import { Dialog } from "@/components/ui/Dialog";
import { DeleteConfirmDialog } from "@/components/ui/DeleteConfirmDialog";
import { useTips, useDeleteTip } from "@/lib/queries/use-tips";
import { usePlaces } from "@/lib/queries/use-places";
import { useTrip } from "@/lib/queries/use-trip";
import { useRealtimeSubscription } from "@/lib/queries/use-realtime-subscription";
import { CategoryFilter } from "./CategoryFilter";
import { TipCard } from "./TipCard";
import { TipForm } from "./TipForm";
import type { Tip } from "@/types/database.types";

// Phrasebook entries are just Phrasebook-category tips — with a whole
// seeded phrase list (ROADMAP.md Milestone P), that's one TipCard per
// phrase otherwise. Consolidated into a single card, one row per phrase
// (ROADMAP.md Milestone S) — every other category keeps the normal
// one-card-per-tip layout, and the page's filter-chips-plus-flat-list
// structure is otherwise unchanged (kept as-is on request).
const PHRASEBOOK_CATEGORY = "Phrasebook";

interface TipsViewProps {
  tripId: string;
  // Web Share Target "Add as Tip" (ROADMAP.md Milestone H) — present means
  // land straight in the add-tip dialog, pre-filled, rather than making
  // the user tap "Add a tip" themselves after already choosing that
  // destination on the share-chooser screen.
  initialSourceUrl?: string;
}

export function TipsView({ tripId, initialSourceUrl }: TipsViewProps) {
  const { data: tips = [], isLoading, error } = useTips(tripId);
  const { data: places = [] } = usePlaces(tripId);
  const { data: trip } = useTrip(tripId);
  const deleteTip = useDeleteTip(tripId);
  useRealtimeSubscription("tips", tripId);

  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [addingTip, setAddingTip] = useState(initialSourceUrl !== undefined);
  const [editingTip, setEditingTip] = useState<Tip | null>(null);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const categories = useMemo(
    () => Array.from(new Set(tips.map((tip) => tip.category))).sort(),
    [tips],
  );
  const visibleTips = selectedCategory
    ? tips.filter((tip) => tip.category === selectedCategory)
    : tips;
  const phrasebookTips = visibleTips.filter(
    (tip) => tip.category === PHRASEBOOK_CATEGORY,
  );
  const otherTips = visibleTips.filter(
    (tip) => tip.category !== PHRASEBOOK_CATEGORY,
  );
  const placeNameById = useMemo(
    () => new Map(places.map((place) => [place.id, place.name])),
    [places],
  );

  const dialogOpen = addingTip || editingTip !== null;
  function closeDialog() {
    setAddingTip(false);
    setEditingTip(null);
  }

  async function handleDelete() {
    if (!editingTip) return;
    setDeleteError(null);
    try {
      await deleteTip.mutateAsync(editingTip.id);
      setConfirmingDelete(false);
      closeDialog();
    } catch (err) {
      setDeleteError(
        err instanceof Error ? err.message : "Couldn't delete that tip — try again.",
      );
    }
  }

  return (
    <div className="flex flex-col gap-4 p-6">
      <div className="flex items-center justify-between gap-2">
        <h1>Tips & Advice</h1>
        <Button
          type="button"
          variant="primary"
          onClick={() => setAddingTip(true)}
        >
          Add a tip
        </Button>
      </div>

      {error && (
        <p className="text-muted">
          Couldn&rsquo;t load tips:{" "}
          {error instanceof Error ? error.message : String(error)}
        </p>
      )}

      <CategoryFilter
        categories={categories}
        selected={selectedCategory}
        onChange={setSelectedCategory}
      />

      {isLoading && <p className="text-muted">Loading…</p>}
      {!isLoading && tips.length === 0 && (
        <p className="text-muted">No tips added yet.</p>
      )}

      <div className="flex flex-col gap-3">
        {otherTips.map((tip) => (
          <TipCard
            key={tip.id}
            tip={tip}
            relatedPlaceName={
              tip.related_place_id
                ? placeNameById.get(tip.related_place_id)
                : undefined
            }
            onEdit={() => setEditingTip(tip)}
          />
        ))}

        {phrasebookTips.length > 0 && (
          <Card>
            <CardMeta>
              <Tag variant="accent">{PHRASEBOOK_CATEGORY}</Tag>
            </CardMeta>
            <div className="flex flex-col gap-2">
              {phrasebookTips.map((tip) => (
                <div
                  key={tip.id}
                  className="flex items-center justify-between gap-2"
                >
                  <span>{tip.content_text}</span>
                  <Button
                    type="button"
                    variant="ghost"
                    icon
                    onClick={() => setEditingTip(tip)}
                    aria-label={`Edit ${tip.content_text ?? "phrase"}`}
                  >
                    <PencilSimple weight="duotone" size={18} />
                  </Button>
                </div>
              ))}
            </div>
          </Card>
        )}
      </div>

      <Dialog
        open={dialogOpen}
        onClose={closeDialog}
        title={editingTip ? "Edit tip" : "Add a tip"}
      >
        <div className="flex flex-col gap-4">
          <TipForm
            tripId={tripId}
            categories={trip?.tip_categories ?? []}
            tip={editingTip ?? undefined}
            initialSourceUrl={editingTip ? undefined : initialSourceUrl}
            onDone={closeDialog}
          />
          {editingTip && (
            <Button
              type="button"
              variant="secondary"
              onClick={() => setConfirmingDelete(true)}
            >
              <Trash weight="duotone" size={20} />
              Delete tip
            </Button>
          )}
        </div>
      </Dialog>

      <DeleteConfirmDialog
        open={confirmingDelete}
        onClose={() => setConfirmingDelete(false)}
        onConfirm={handleDelete}
        title="Delete this tip?"
        description="This can't be undone."
        pending={deleteTip.isPending}
        error={deleteError}
      />
    </div>
  );
}
