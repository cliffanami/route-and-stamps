"use client";

import { PencilSimple, CheckCircle } from "@phosphor-icons/react";
import { Card, CardTitle, CardBody, CardMeta } from "@/components/ui/Card";
import { Tag } from "@/components/ui/Tag";
import { Button } from "@/components/ui/Button";
import { formatMinor } from "@/lib/money/currency";
import {
  useUpdateBudgetLineStatus,
  useMarkBudgetLinePaid,
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

// Status tap-cycles not_booked <-> pending only (ROADMAP.md's mark-as-paid
// work) — reaching "paid" is the dedicated Mark as paid action instead,
// since that's the one path that also has to record paid_at; tapping the
// tag while already "paid" steps back to not_booked (an undo), clearing
// paid_at via the same mutation.
export function CostLineRow({ tripId, line, onEdit }: CostLineRowProps) {
  const updateStatus = useUpdateBudgetLineStatus(tripId);
  const markPaid = useMarkBudgetLinePaid(tripId);

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
      <CardMeta>
        <div className="flex items-center gap-2">
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
          {line.status === "paid" && line.paid_at && (
            <span className="text-muted">
              {new Date(line.paid_at).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
              })}
            </span>
          )}
          {line.status !== "paid" && (
            <Button
              type="button"
              variant="ghost"
              onClick={() => markPaid.mutate(line.id)}
              disabled={markPaid.isPending}
            >
              <CheckCircle weight="duotone" size={16} />
              Mark as paid
            </Button>
          )}
        </div>
      </CardMeta>
    </Card>
  );
}
