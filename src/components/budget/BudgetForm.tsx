"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import { useAddBudgetLine, useUpdateBudgetLine } from "@/lib/queries/use-budget-lines";
import { minorToDecimalString } from "@/lib/money/currency";
import type { BudgetLine } from "@/types/database.types";

interface BudgetFormProps {
  tripId: string;
  onDone: () => void;
  // Strict selects (ROADMAP.md Milestone A follow-up) — sourced from the
  // trip's own configured lists (Trip Settings), not derived from
  // already-used values.
  categories: string[];
  currencies: string[];
  line?: BudgetLine;
  // Pre-fills a new cost (distinct from `line`, which signals full-edit
  // mode) — used by PlaceDetail's "Add a cost" button (ROADMAP.md
  // Milestone B) to link the new line to that place without the user
  // having to pick it.
  initialValues?: { place_id: string; description: string };
}

// Doubles as the edit form — pass an existing `line` to prefill and update
// it instead of logging a new cost. Booking status stays owned by
// CostLineRow's tap-to-cycle tag, not editable here.
export function BudgetForm({
  tripId,
  onDone,
  categories,
  currencies,
  line,
  initialValues,
}: BudgetFormProps) {
  const addLine = useAddBudgetLine(tripId);
  const updateLine = useUpdateBudgetLine(tripId);
  const { showToast } = useToast();
  const isEditing = line !== undefined;

  const [category, setCategory] = useState(line?.category ?? "");
  const [description, setDescription] = useState(
    line?.description ?? initialValues?.description ?? "",
  );
  const [amount, setAmount] = useState(
    line ? minorToDecimalString(line.amount_minor, line.currency) : "",
  );
  const [currency, setCurrency] = useState(line?.currency ?? "");
  const [error, setError] = useState<string | null>(null);

  // Defensive: keeps a legacy value not in the current configured list
  // selectable when editing an existing line, rather than silently
  // dropped from the dropdown.
  const categoryOptions = Array.from(
    new Set([...categories, ...(line ? [line.category] : [])]),
  );
  const currencyOptions = Array.from(
    new Set([...currencies, ...(line ? [line.currency] : [])]),
  );

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);

    try {
      if (isEditing) {
        await updateLine.mutateAsync({
          id: line.id,
          category,
          description,
          amount,
          currency,
        });
        showToast("Cost updated");
      } else {
        await addLine.mutateAsync({
          category,
          description,
          amount,
          currency,
          status: "not_booked",
          paid_by: null,
          payment_details: null,
          due_date: null,
          place_id: initialValues?.place_id ?? null,
        });
        showToast("Cost logged");
      }
      onDone();
    } catch {
      setError("Couldn't save that cost — try again.");
    }
  }

  const pending = isEditing ? updateLine.isPending : addLine.isPending;

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="field">
        <label htmlFor="budget-category">Category</label>
        <select
          id="budget-category"
          className="input"
          value={category}
          onChange={(event) => setCategory(event.target.value)}
          required
        >
          <option value="">— Select —</option>
          {categoryOptions.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </div>

      <div className="field">
        <label htmlFor="budget-description">Description</label>
        <input
          id="budget-description"
          className="input"
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          required
        />
      </div>

      <div className="flex gap-2">
        <div className="field flex-1">
          <label htmlFor="budget-amount">Amount</label>
          <input
            id="budget-amount"
            className="input"
            inputMode="decimal"
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
            placeholder="45.00"
            required
          />
        </div>
        <div className="field flex-1">
          <label htmlFor="budget-currency">Currency</label>
          <select
            id="budget-currency"
            className="input"
            value={currency}
            onChange={(event) => setCurrency(event.target.value)}
            required
          >
            <option value="">— Select —</option>
            {currencyOptions.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
      </div>

      {error && <p className="text-muted">{error}</p>}

      <Button type="submit" variant="primary" disabled={pending}>
        {pending ? "Saving…" : isEditing ? "Save changes" : "Save cost"}
      </Button>
    </form>
  );
}
