"use client";

import { useState } from "react";
import Link from "next/link";
import { Trash } from "@phosphor-icons/react";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { DeleteConfirmDialog } from "@/components/ui/DeleteConfirmDialog";
import { useTrip } from "@/lib/queries/use-trip";
import { useBudgetLines, useDeleteBudgetLine } from "@/lib/queries/use-budget-lines";
import { useRealtimeSubscription } from "@/lib/queries/use-realtime-subscription";
import { BudgetSummary } from "./BudgetSummary";
import { CostLineRow } from "./CostLineRow";
import { BudgetForm } from "./BudgetForm";
import type { BudgetLine } from "@/types/database.types";

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
  const deleteLine = useDeleteBudgetLine(tripId);
  useRealtimeSubscription("budget_lines", tripId);

  const [addingLine, setAddingLine] = useState(false);
  const [editingLine, setEditingLine] = useState<BudgetLine | null>(null);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const dialogOpen = addingLine || editingLine !== null;
  function closeDialog() {
    setAddingLine(false);
    setEditingLine(null);
  }

  async function handleDelete() {
    if (!editingLine) return;
    setDeleteError(null);
    try {
      await deleteLine.mutateAsync(editingLine.id);
      setConfirmingDelete(false);
      closeDialog();
    } catch (err) {
      setDeleteError(
        err instanceof Error ? err.message : "Couldn't delete that cost — try again.",
      );
    }
  }

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
          onClick={() => setAddingLine(true)}
        >
          Log a cost
        </Button>
      </div>

      <BudgetSummary trip={trip} lines={lines} />

      <p className="text-muted">
        Cap and currency now live in{" "}
        <Link href={`/trips/${tripId}/settings`}>Trip Settings</Link>.
      </p>

      <div className="flex flex-col gap-3">
        {lines.map((line) => (
          <CostLineRow
            key={line.id}
            tripId={tripId}
            line={line}
            onEdit={() => setEditingLine(line)}
          />
        ))}
      </div>

      <Dialog
        open={dialogOpen}
        onClose={closeDialog}
        title={editingLine ? "Edit cost" : "Log a cost"}
      >
        <div className="flex flex-col gap-4">
          <BudgetForm
            tripId={tripId}
            categories={trip.budget_categories}
            currencies={trip.currencies}
            line={editingLine ?? undefined}
            onDone={closeDialog}
          />
          {editingLine && (
            <Button
              type="button"
              variant="secondary"
              onClick={() => setConfirmingDelete(true)}
            >
              <Trash weight="duotone" size={20} />
              Delete cost
            </Button>
          )}
        </div>
      </Dialog>

      <DeleteConfirmDialog
        open={confirmingDelete}
        onClose={() => setConfirmingDelete(false)}
        onConfirm={handleDelete}
        title="Delete this cost?"
        description="This can't be undone."
        pending={deleteLine.isPending}
        error={deleteError}
      />
    </div>
  );
}
