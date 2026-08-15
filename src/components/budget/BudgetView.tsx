"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { useTrip } from "@/lib/queries/use-trip";
import { useBudgetLines } from "@/lib/queries/use-budget-lines";
import { useRealtimeSubscription } from "@/lib/queries/use-realtime-subscription";
import { BudgetSummary } from "./BudgetSummary";
import { CostLineRow } from "./CostLineRow";
import { BudgetForm } from "./BudgetForm";
import { TripBudgetSettings } from "./TripBudgetSettings";

interface BudgetViewProps {
  tripId: string;
}

export function BudgetView({ tripId }: BudgetViewProps) {
  const {
    data: trip,
    isLoading: tripLoading,
    error: tripError,
  } = useTrip(tripId);
  const {
    data: lines = [],
    isLoading: linesLoading,
    error: linesError,
  } = useBudgetLines(tripId);
  useRealtimeSubscription("budget_lines", tripId);

  const [formOpen, setFormOpen] = useState(false);
  const categories = useMemo(
    () => Array.from(new Set(lines.map((line) => line.category))),
    [lines],
  );

  const error = tripError ?? linesError;
  if (error) {
    return (
      <p className="px-6 py-4 text-muted">
        Couldn&rsquo;t load the budget:{" "}
        {error instanceof Error ? error.message : String(error)}
      </p>
    );
  }

  if (tripLoading || linesLoading || !trip) {
    return <p className="px-6 py-4 text-muted">Loading…</p>;
  }

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex items-center justify-between gap-2">
        <h1>Budget</h1>
        <Button
          type="button"
          variant="primary"
          onClick={() => setFormOpen(true)}
        >
          Log a cost
        </Button>
      </div>

      <TripBudgetSettings tripId={tripId} trip={trip} />

      <BudgetSummary trip={trip} lines={lines} />

      <div className="flex flex-col gap-3">
        {lines.map((line) => (
          <CostLineRow key={line.id} tripId={tripId} line={line} />
        ))}
      </div>

      <Dialog
        open={formOpen}
        onClose={() => setFormOpen(false)}
        title="Log a cost"
      >
        <BudgetForm
          tripId={tripId}
          existingCategories={categories}
          onDone={() => setFormOpen(false)}
        />
      </Dialog>
    </div>
  );
}
