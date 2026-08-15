"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import { useAddPackingItem } from "@/lib/queries/use-packing-items";

interface PackingFormProps {
  tripId: string;
  currentUserId: string;
  onDone: () => void;
}

type Scope = "shared" | "mine";

// Shared vs. personal is a scope choice, same .seg pattern TipForm uses for
// text/video (ROADMAP.md M5) — owner_id null means shared/trip-essentials.
export function PackingForm({
  tripId,
  currentUserId,
  onDone,
}: PackingFormProps) {
  const addItem = useAddPackingItem(tripId);
  const { showToast } = useToast();

  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [scope, setScope] = useState<Scope>("shared");
  const [isDocument, setIsDocument] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);

    try {
      await addItem.mutateAsync({
        name,
        category: category.trim() || null,
        is_document: isDocument,
        owner_id: scope === "mine" ? currentUserId : null,
      });
      showToast("Item added");
      onDone();
    } catch {
      setError("Couldn't add that item — try again.");
    }
  }

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

      {error && <p className="text-muted">{error}</p>}

      <Button type="submit" variant="primary" disabled={addItem.isPending}>
        {addItem.isPending ? "Adding…" : "Add item"}
      </Button>
    </form>
  );
}
