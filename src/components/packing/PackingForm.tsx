"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import { useAddPackingItem, useUpdatePackingItem } from "@/lib/queries/use-packing-items";
import type { PackingItem } from "@/types/database.types";

interface PackingFormProps {
  tripId: string;
  currentUserId: string;
  onDone: () => void;
  item?: PackingItem;
}

type Scope = "shared" | "mine";

// Shared vs. personal is a scope choice, same .seg pattern TipForm uses for
// text/video (ROADMAP.md M5) — owner_id null means shared/trip-essentials.
// Doubles as the edit form — pass an existing `item` to prefill and update
// it instead of adding a new one.
export function PackingForm({
  tripId,
  currentUserId,
  onDone,
  item,
}: PackingFormProps) {
  const addItem = useAddPackingItem(tripId);
  const updateItem = useUpdatePackingItem(tripId);
  const { showToast } = useToast();
  const isEditing = item !== undefined;

  const [name, setName] = useState(item?.name ?? "");
  const [category, setCategory] = useState(item?.category ?? "");
  const [scope, setScope] = useState<Scope>(
    item && item.owner_id !== null ? "mine" : "shared",
  );
  const [isDocument, setIsDocument] = useState(item?.is_document ?? false);
  const [dueDate, setDueDate] = useState(item?.due_date ?? "");
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);

    const input = {
      name,
      category: category.trim() || null,
      is_document: isDocument,
      owner_id: scope === "mine" ? currentUserId : null,
      due_date: dueDate || null,
    };

    try {
      if (isEditing) {
        await updateItem.mutateAsync({ id: item.id, ...input });
        showToast("Item updated");
      } else {
        await addItem.mutateAsync(input);
        showToast("Item added");
      }
      onDone();
    } catch {
      setError(
        isEditing
          ? "Couldn't save that item — try again."
          : "Couldn't add that item — try again.",
      );
    }
  }

  const pending = isEditing ? updateItem.isPending : addItem.isPending;

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="field">
        <label htmlFor="packing-name">Item</label>
        <input
          id="packing-name"
          className="input"
          value={name}
          onChange={(event) => setName(event.target.value)}
          required
        />
      </div>

      <div className="field">
        <label htmlFor="packing-category">Category (optional)</label>
        <input
          id="packing-category"
          className="input"
          value={category}
          onChange={(event) => setCategory(event.target.value)}
        />
      </div>

      <div className="seg" role="radiogroup" aria-label="List">
        {(["shared", "mine"] as const).map((value) => (
          <label key={value} className="seg-opt">
            <input
              type="radio"
              name="packing-scope"
              value={value}
              checked={scope === value}
              onChange={() => setScope(value)}
            />
            {value === "shared" ? "Trip essentials" : "Just for me"}
          </label>
        ))}
      </div>

      <label className="field flex flex-row items-center gap-2">
        <input
          type="checkbox"
          checked={isDocument}
          onChange={(event) => setIsDocument(event.target.checked)}
        />
        This is a document (passport, visa, etc.)
      </label>

      <div className="field">
        <label htmlFor="packing-due-date">Reminder date (optional)</label>
        <input
          id="packing-due-date"
          type="date"
          className="input"
          value={dueDate}
          onChange={(event) => setDueDate(event.target.value)}
        />
      </div>

      {error && <p className="text-muted">{error}</p>}

      <Button type="submit" variant="primary" disabled={pending}>
        {pending ? "Saving…" : isEditing ? "Save changes" : "Add item"}
      </Button>
    </form>
  );
}
