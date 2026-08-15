"use client";

import { PencilSimple } from "@phosphor-icons/react";
import { Button } from "@/components/ui/Button";
import type { PackingItem } from "@/types/database.types";

interface ChecklistItemProps {
  item: PackingItem;
  onToggle: (isChecked: boolean) => void;
  onEdit: () => void;
  disabled?: boolean;
}

// The one component ARCHITECTURE.md names for this milestone — reused
// across the shared, personal, and documents sections (ROADMAP.md M5).
// The edit button sits outside the <label> so clicking it doesn't also
// toggle the checkbox via label-click propagation.
export function ChecklistItem({
  item,
  onToggle,
  onEdit,
  disabled,
}: ChecklistItemProps) {
  return (
    <div className="flex items-center justify-between gap-2">
      <label className="field flex flex-row items-center gap-2">
        <input
          type="checkbox"
          checked={item.is_checked}
          onChange={(event) => onToggle(event.target.checked)}
          disabled={disabled}
        />
        <span
          className={item.is_checked ? "text-muted" : undefined}
          style={item.is_checked ? { textDecoration: "line-through" } : undefined}
        >
          {item.name}
          {item.category && ` — ${item.category}`}
        </span>
      </label>
      <Button
        type="button"
        variant="ghost"
        icon
        onClick={onEdit}
        aria-label="Edit item"
      >
        <PencilSimple weight="duotone" size={20} />
      </Button>
    </div>
  );
}
