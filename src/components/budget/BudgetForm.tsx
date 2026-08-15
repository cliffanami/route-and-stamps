"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import { useAddBudgetLine } from "@/lib/queries/use-budget-lines";

interface BudgetFormProps {
  tripId: string;
  onDone: () => void;
  existingCategories: string[];
}

// Suggested categories from schema.sql's column comment, plus whatever's
// already used on the trip — same free-tag-with-suggestions pattern as
// TipForm's category input (ROADMAP.md M3/M4 share the shape).
const SUGGESTED_CATEGORIES = [
  "flights",
  "accommodation",
  "guided_tour",
  "visa",
  "meals",
  "activities",
  "other",
];

export function BudgetForm({
  tripId,
  onDone,
  existingCategories,
}: BudgetFormProps) {
  const addLine = useAddBudgetLine(tripId);
  const { showToast } = useToast();

  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState("");
  const [error, setError] = useState<string | null>(null);

  const categoryOptions = Array.from(
    new Set([...SUGGESTED_CATEGORIES, ...existingCategories]),
  );

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);

    try {
      await addLine.mutateAsync({
        category,
        description,
        amount,
        currency,
        status: "not_booked",
        paid_by: null,
        payment_details: null,
        due_date: null,
      });
      showToast("Cost logged");
      onDone();
    } catch {
      setError("Couldn't save that cost — try again.");
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="field">
        <label htmlFor="budget-category">Category</label>
        <input
          id="budget-category"
          className="input"
          list="budget-categories"
          value={category}
          onChange={(event) => setCategory(event.target.value)}
          required
        />
        <datalist id="budget-categories">
          {categoryOptions.map((c) => (
            <option key={c} value={c} />
          ))}
        </datalist>
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
          <input
            id="budget-currency"
            className="input"
            list="budget-currencies"
            value={currency}
            onChange={(event) => setCurrency(event.target.value)}
            placeholder="JPY"
            maxLength={3}
            required
          />
          <datalist id="budget-currencies">
            <option value="JPY" />
            <option value="KES" />
            <option value="USD" />
          </datalist>
        </div>
      </div>

      {error && <p className="text-muted">{error}</p>}

      <Button type="submit" variant="primary" disabled={addLine.isPending}>
        {addLine.isPending ? "Saving…" : "Save cost"}
      </Button>
    </form>
  );
}
