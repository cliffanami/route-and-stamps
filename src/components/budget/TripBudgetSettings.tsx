"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import { useUpdateTripBudgetSettings } from "@/lib/queries/use-trip";
import type { BudgetMode, Trip } from "@/types/database.types";

interface TripBudgetSettingsProps {
  tripId: string;
  trip: Trip;
}

// Cap vs. tally, set per trip (ROADMAP.md M4) — rendered on the Trip
// Settings page (ROADMAP.md Milestone A) rather than the Budget page,
// where it originally lived as a placement-gap panel.
export function TripBudgetSettings({ tripId, trip }: TripBudgetSettingsProps) {
  const updateSettings = useUpdateTripBudgetSettings(tripId);
  const { showToast } = useToast();

  const [mode, setMode] = useState<BudgetMode>(trip.budget_mode);
  const [capAmount, setCapAmount] = useState(
    trip.budget_cap !== null ? String(trip.budget_cap) : "",
  );
  const [capCurrency, setCapCurrency] = useState(
    trip.budget_cap_currency ?? "",
  );
  const [error, setError] = useState<string | null>(null);

  // Defensive: keeps a legacy currency not in the current configured list
  // (e.g. set before the list existed) selectable rather than silently
  // dropped from the dropdown.
  const currencyOptions = Array.from(
    new Set([...trip.currencies, ...(trip.budget_cap_currency ? [trip.budget_cap_currency] : [])]),
  );

  async function handleSave() {
    setError(null);
    try {
      await updateSettings.mutateAsync({
        budget_mode: mode,
        budget_cap: mode === "cap" ? Number.parseFloat(capAmount) : null,
        budget_cap_currency: mode === "cap" ? capCurrency : null,
      });
      showToast("Budget settings saved");
    } catch {
      setError("Couldn't save budget settings — try again.");
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="seg" role="radiogroup" aria-label="Budget mode">
        {(["tally", "cap"] as const).map((value) => (
          <label key={value} className="seg-opt">
            <input
              type="radio"
              name="budget-mode"
              value={value}
              checked={mode === value}
              onChange={() => setMode(value)}
            />
            {value === "tally" ? "Tally" : "Cap"}
          </label>
        ))}
      </div>

      {mode === "cap" && (
        <div className="flex gap-2">
          <div className="field flex-1">
            <label htmlFor="cap-amount">Cap amount</label>
            <input
              id="cap-amount"
              className="input"
              inputMode="decimal"
              value={capAmount}
              onChange={(event) => setCapAmount(event.target.value)}
              placeholder="50000.00"
            />
          </div>
          <div className="field flex-1">
            <label htmlFor="cap-currency">Cap currency</label>
            <select
              id="cap-currency"
              className="input"
              value={capCurrency}
              onChange={(event) => setCapCurrency(event.target.value)}
            >
              <option value="">— Select —</option>
              {currencyOptions.map((currency) => (
                <option key={currency} value={currency}>
                  {currency}
                </option>
              ))}
            </select>
            {currencyOptions.length === 0 && (
              <p className="text-muted">
                Add a currency in the list below first.
              </p>
            )}
          </div>
        </div>
      )}

      {error && <p className="text-muted">{error}</p>}

      <Button
        type="button"
        variant="secondary"
        onClick={handleSave}
        disabled={updateSettings.isPending}
      >
        {updateSettings.isPending ? "Saving…" : "Save budget settings"}
      </Button>
    </div>
  );
}
