"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { DeleteConfirmDialog } from "@/components/ui/DeleteConfirmDialog";
import { useTripMembers } from "@/lib/queries/use-trip-members";
import {
  useTogglePackingItem,
  useTogglePackingItemCheck,
  usePackingItems,
  usePackingItemChecks,
  useDeletePackingItem,
} from "@/lib/queries/use-packing-items";
import { useRealtimeSubscription } from "@/lib/queries/use-realtime-subscription";
import { PackingMatrix } from "./PackingMatrix";
import { PackingItemDetailDialog } from "./PackingItemDetailDialog";
import { PackingForm } from "./PackingForm";
import type { PackingItem } from "@/types/database.types";

interface PackingViewProps {
  tripId: string;
}

// Matrix view (item rows × member columns) replaced the old three-section
// Shared/My-list/Documents layout — the latter's Documents section never
// split by owner, so a per-person item (e.g. "Get bank statements")
// visibly duplicated once per person with no label distinguishing them.
// The matrix makes "one task, tracked independently per person" legible
// at a glance instead (ROADMAP.md's packing-matrix follow-up).
export function PackingView({ tripId }: PackingViewProps) {
  const { data: items = [], isLoading, error } = usePackingItems(tripId);
  const { data: checks = [] } = usePackingItemChecks(tripId);
  const { data: members = [] } = useTripMembers(tripId);
  const toggleShared = useTogglePackingItem(tripId);
  const toggleCheck = useTogglePackingItemCheck(tripId);
  const deleteItem = useDeletePackingItem(tripId);
  useRealtimeSubscription("packing_items", tripId);
  useRealtimeSubscription("packing_item_checks", tripId);

  const [userId, setUserId] = useState<string | null>(null);
  const [addingItem, setAddingItem] = useState(false);
  const [detailItem, setDetailItem] = useState<PackingItem | null>(null);
  const [editingItem, setEditingItem] = useState<PackingItem | null>(null);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth
      .getUser()
      .then(({ data }) => setUserId(data.user?.id ?? null));
  }, []);

  const formDialogOpen = addingItem || editingItem !== null;
  function closeFormDialog() {
    setAddingItem(false);
    setEditingItem(null);
  }

  async function handleDelete() {
    const target = editingItem ?? detailItem;
    if (!target) return;
    setDeleteError(null);
    try {
      await deleteItem.mutateAsync(target.id);
      setConfirmingDelete(false);
      closeFormDialog();
      setDetailItem(null);
    } catch (err) {
      setDeleteError(
        err instanceof Error ? err.message : "Couldn't delete that item — try again.",
      );
    }
  }

  if (error) {
    return (
      <p className="px-6 py-4 text-muted">
        Couldn&rsquo;t load the packing list:{" "}
        {error instanceof Error ? error.message : String(error)}
      </p>
    );
  }

  if (isLoading) {
    return <p className="px-6 py-4 text-muted">Loading…</p>;
  }

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex items-center justify-between gap-2">
        <h1>Packing</h1>
        <Button
          type="button"
          variant="primary"
          onClick={() => setAddingItem(true)}
          disabled={!userId}
        >
          Add an item
        </Button>
      </div>

      {items.length === 0 ? (
        <p className="text-muted">No packing items added yet.</p>
      ) : (
        <PackingMatrix
          items={items}
          checks={checks}
          members={members}
          currentUserId={userId}
          onToggleShared={(item, checked) =>
            toggleShared.mutate({ id: item.id, isChecked: checked })
          }
          onToggleCheck={(item, checked) =>
            toggleCheck.mutate({ itemId: item.id, checked })
          }
          onShowDetail={setDetailItem}
        />
      )}

      <PackingItemDetailDialog
        item={detailItem}
        checks={checks}
        members={members}
        onClose={() => setDetailItem(null)}
        onEdit={() => {
          setEditingItem(detailItem);
          setDetailItem(null);
        }}
        onDelete={() => setConfirmingDelete(true)}
      />

      {userId && (
        <Dialog
          open={formDialogOpen}
          onClose={closeFormDialog}
          title={editingItem ? "Edit item" : "Add a packing item"}
        >
          <PackingForm
            tripId={tripId}
            item={editingItem ?? undefined}
            onDone={closeFormDialog}
          />
        </Dialog>
      )}

      <DeleteConfirmDialog
        open={confirmingDelete}
        onClose={() => setConfirmingDelete(false)}
        onConfirm={handleDelete}
        title="Delete this item?"
        description="This can't be undone."
        pending={deleteItem.isPending}
        error={deleteError}
      />
    </div>
  );
}
