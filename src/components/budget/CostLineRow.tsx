"use client";

import { PencilSimple } from "@phosphor-icons/react";
import { Card, CardTitle, CardBody, CardMeta } from "@/components/ui/Card";
import { Tag } from "@/components/ui/Tag";
import { Button } from "@/components/ui/Button";
import { formatMinor } from "@/lib/money/currency";
import {
  useUpdateBudgetLineStatus,
  STATUS_CYCLE,
} from "@/lib/queries/use-budget-lines";
import type { BudgetLine, BudgetStatus } from "@/types/database.types";

interface CostLineRowProps {
  tripId: string;
  line: BudgetLine;
  onEdit: () => void;
}

const STATUS_LABEL: Record<BudgetStatus, string> = {
  not_booked: "Not booked",
  pending: "Pending",
  paid: "Paid",
};

const STATUS_VARIANT: Record<BudgetStatus, "neutral" | "accent-2" | "accent"> =
  {
    not_booked: "neutral",
    pending: "accent-2",
    paid: "accent",
  };

// Status advances on tap through not_booked -> pending -> paid -> not_booked
// — the same clickable-tag pattern CategoryFilter established for tips,
// applied here as a cycle rather than a toggle since there are three states.
export function CostLineRow({ tripId, line, onEdit }: CostLineRowProps) {
  const updateStatus = useUpdateBudgetLineStatus(tripId);

  return (
    <Card>
      <div className="flex items-start justify-between gap-2">
        <CardMeta>
          <Tag variant="neutral">{line.category}</Tag>
        </CardMeta>
        <Button
          type="button"
          variant="ghost"
          icon
          onClick={onEdit}
          aria-label="Edit cost"
        >
          <PencilSimple weight="duotone" size={20} />
        </Button>
      </div>
      <CardTitle>{line.description}</CardTitle>
      <CardBody>{formatMinor(line.amount_minor, line.currency)}</CardBody>
      <button
        type="button"
        className={`tag tag-${STATUS_VARIANT[line.status]}`}
        onClick={() =>
          updateStatus.mutate({
            id: line.id,
            status: STATUS_CYCLE[line.status],
          })
        }
        disabled={updateStatus.isPending}
      >
        {STATUS_LABEL[line.status]}
      </button>
    </Card>
  );
}
