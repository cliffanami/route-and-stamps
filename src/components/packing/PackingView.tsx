"use client";

import { useEffect, useState } from "react";
import { Trash } from "@phosphor-icons/react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { DeleteConfirmDialog } from "@/components/ui/DeleteConfirmDialog";
import { useTrip } from "@/lib/queries/use-trip";
import {
  useTogglePackingItem,
  usePackingItems,
  useDeletePackingItem,
} from "@/lib/queries/use-packing-items";
import { useRealtimeSubscription } from "@/lib/queries/use-realtime-subscription";
import { ChecklistItem } from "./ChecklistItem";
import { PackingForm } from "./PackingForm";
import type { PackingItem } from "@/types/database.types";

interface PackingViewProps {
  tripId: string;
}

function Section({
  title,
  items,
  onToggle,
  onEdit,
}: {
  title: string;
  items: PackingItem[];
  onToggle: (item: PackingItem, isChecked: boolean) => void;
  onEdit: (item: PackingItem) => void;
}) {
  if (items.length === 0) return null;

  return (
    <section className="flex flex-col gap-2">
      <h2>{title}</h2>
      <div className="flex flex-col gap-2">
        {items.map((item) => (
          <ChecklistItem
            key={item.id}
            item={item}
            onToggle={(checked) => onToggle(item, checked)}
            onEdit={() => onEdit(item)}
          />
        ))}
      </div>
    </section>
  );
}

export function PackingView({ tripId }: PackingViewProps) {
  const { data: trip } = useTrip(tripId);
  const { data: items = [], isLoading, error } = usePackingItems(tripId);
  const toggleItem = useTogglePackingItem(tripId);
  const deleteItem = useDeletePackingItem(tripId);
  useRealtimeSubscription("packing_items", tripId);

  const [userId, setUserId] = useState<string | null>(null);
  const [addingItem, setAddingItem] = useState(false);
  const [editingItem, setEditingItem] = useState<PackingItem | null>(null);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth
      .getUser()
      .then(({ data }) => setUserId(data.user?.id ?? null));
  }, []);

  function handleToggle(item: PackingItem, isChecked: boolean) {
    toggleItem.mutate({ id: item.id, isChecked });
  }

  const dialogOpen = addingItem || editingItem !== null;
  function closeDialog() {
    setAddingItem(false);
    setEditingItem(null);
  }

  async function handleDelete() {
    if (!editingItem) return;
    setDeleteError(null);
    try {
      await deleteItem.mutateAsync(editingItem.id);
      setConfirmingDelete(false);
      closeDialog();
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

  const shared = items.filter(
    (item) => item.owner_id === null && !item.is_document,
  );
  const mine = items.filter(
    (item) => item.owner_id === userId && !item.is_document,
  );
  const documents = items.filter((item) => item.is_document);

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

      {items.length === 0 && (
        <p className="text-muted">No packing items added yet.</p>
      )}

      <Section
        title="Trip essentials"
        items={shared}
        onToggle={handleToggle}
        onEdit={setEditingItem}
      />
      <Section
        title="My list"
        items={mine}
        onToggle={handleToggle}
        onEdit={setEditingItem}
      />
      {trip?.is_international && (
        <Section
          title="Visa & Documents"
          items={documents}
          onToggle={handleToggle}
          onEdit={setEditingItem}
        />
      )}

      {userId && (
        <Dialog
          open={dialogOpen}
          onClose={closeDialog}
          title={editingItem ? "Edit item" : "Add a packing item"}
        >
          <div className="flex flex-col gap-4">
            <PackingForm
              tripId={tripId}
              currentUserId={userId}
              item={editingItem ?? undefined}
              onDone={closeDialog}
            />
            {editingItem && (
              <Button
                type="button"
                variant="secondary"
                onClick={() => setConfirmingDelete(true)}
              >
                <Trash weight="duotone" size={20} />
                Delete item
              </Button>
            )}
          </div>
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
