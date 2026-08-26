"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import { useAddPackingItem, useUpdatePackingItem } from "@/lib/queries/use-packing-items";
import type { PackingItem } from "@/types/database.types";

const ADD_NEW_CATEGORY = "__add_new__";

interface PackingFormProps {
  tripId: string;
  onDone: () => void;
  item?: PackingItem;
  // Strict select (ROADMAP.md Milestone Q), sourced from the trip's own
  // configured list (Trip Settings), not derived from already-used values.
  categories: string[];
  // Adds the category to the trip's configured list (a Trip Settings
  // update under the hood) without leaving this form — live-usage
  // feedback: if the category you want doesn't exist yet, you shouldn't
  // have to go configure it elsewhere first.
  onAddCategory: (category: string) => Promise<void>;
}

// Shared vs. per-person is a scope choice, same .seg pattern TipForm uses
// for text/video (ROADMAP.md M5, redesigned per the packing matrix
// follow-up) — shared items use a single checkbox everyone shares;
// per-person items get one independent checkbox per current trip member,
// tracked via packing_item_checks, not a duplicated row per person.
// Doubles as the edit form — pass an existing `item` to prefill and update
// it instead of adding a new one.
export function PackingForm({
  tripId,
  onDone,
  item,
  categories,
  onAddCategory,
}: PackingFormProps) {
  const addItem = useAddPackingItem(tripId);
  const updateItem = useUpdatePackingItem(tripId);
  const { showToast } = useToast();
  const isEditing = item !== undefined;

  const [name, setName] = useState(item?.name ?? "");
  const [category, setCategory] = useState(item?.category ?? "");
  // Defensive: keeps a legacy category not in the current configured list
  // selectable when editing an existing item.
  const categoryOptions = Array.from(
    new Set([...categories, ...(item?.category ? [item.category] : [])]),
  );
  const [addingCategory, setAddingCategory] = useState(false);
  const [newCategoryDraft, setNewCategoryDraft] = useState("");
  const [addCategoryPending, setAddCategoryPending] = useState(false);
  const [addCategoryError, setAddCategoryError] = useState<string | null>(null);
  const [description, setDescription] = useState(item?.description ?? "");
  const [isShared, setIsShared] = useState(item?.is_shared ?? true);
  const [isDocument, setIsDocument] = useState(item?.is_document ?? false);
  const [dueDate, setDueDate] = useState(item?.due_date ?? "");
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);

    const input = {
      name,
      category: category || null,
      description: description.trim() || null,
      is_document: isDocument,
      is_shared: isShared,
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

  async function handleAddNewCategory() {
    const clean = newCategoryDraft.trim();
    if (!clean) return;

    // Already configured (or was just added) — select it, same
    // silent-dedup behavior TagListEditor already uses elsewhere.
    if (categoryOptions.includes(clean)) {
      setCategory(clean);
      setAddingCategory(false);
      setNewCategoryDraft("");
      setAddCategoryError(null);
      return;
    }

    setAddCategoryPending(true);
    setAddCategoryError(null);
    try {
      await onAddCategory(clean);
      setCategory(clean);
      setAddingCategory(false);
      setNewCategoryDraft("");
    } catch {
      setAddCategoryError("Couldn't add that category — try again.");
    } finally {
      setAddCategoryPending(false);
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
        <select
          id="packing-category"
          className="input"
          value={category}
          onChange={(event) => {
            if (event.target.value === ADD_NEW_CATEGORY) {
              setAddingCategory(true);
              return;
            }
            setCategory(event.target.value);
          }}
        >
          <option value="">— None —</option>
          {categoryOptions.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
          <option value={ADD_NEW_CATEGORY}>+ Add a new category…</option>
        </select>
      </div>

      {addingCategory && (
        <div className="field">
          <label htmlFor="packing-new-category">New category name</label>
          <div className="flex gap-2">
            <input
              id="packing-new-category"
              className="input"
              value={newCategoryDraft}
              onChange={(event) => {
                setNewCategoryDraft(event.target.value);
                setAddCategoryError(null);
              }}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  handleAddNewCategory();
                }
              }}
              autoFocus
            />
            <Button
              type="button"
              variant="secondary"
              onClick={handleAddNewCategory}
              disabled={addCategoryPending || !newCategoryDraft.trim()}
            >
              {addCategoryPending ? "Adding…" : "Add"}
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                setAddingCategory(false);
                setNewCategoryDraft("");
                setAddCategoryError(null);
              }}
            >
              Cancel
            </Button>
          </div>
          {addCategoryError && <p className="text-muted">{addCategoryError}</p>}
        </div>
      )}

      <div className="field">
        <label htmlFor="packing-description">Description (optional)</label>
        <input
          id="packing-description"
          className="input"
          placeholder="Which bag, buy at the airport, etc."
          value={description}
          onChange={(event) => setDescription(event.target.value)}
        />
      </div>

      <div className="seg" role="radiogroup" aria-label="Tracking">
        {(["shared", "per-person"] as const).map((value) => (
          <label key={value} className="seg-opt">
            <input
              type="radio"
              name="packing-scope"
              value={value}
              checked={isShared === (value === "shared")}
              onChange={() => setIsShared(value === "shared")}
            />
            {value === "shared" ? "Shared" : "Per person"}
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
