"use client";

import type { PackingItem } from "@/types/database.types";

interface ChecklistItemProps {
  item: PackingItem;
  onToggle: (isChecked: boolean) => void;
  disabled?: boolean;
}

// The one component ARCHITECTURE.md names for this milestone — reused
// across the shared, personal, and documents sections (ROADMAP.md M5).
export function ChecklistItem({
  item,
  onToggle,
  disabled,
}: ChecklistItemProps) {
  return (
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
  );
}
