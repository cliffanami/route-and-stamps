"use client";

import { PencilSimple } from "@phosphor-icons/react";
import { Card, CardMeta } from "@/components/ui/Card";
import { Tag } from "@/components/ui/Tag";
import { Button } from "@/components/ui/Button";
import { AddToCalendarLink } from "@/components/calendar/AddToCalendarLink";
import { formatPlainDate } from "@/lib/text/format-plain-date";
import { todoToIcsEvent } from "@/lib/calendar/generate-ics";
import { PHASE_LABEL } from "./PhaseFilter";
import type { Todo } from "@/types/database.types";

interface TodoRowProps {
  todo: Todo;
  relatedPlaceName?: string;
  onToggle: (isDone: boolean) => void;
  onEdit: () => void;
}

// Shared-only completion — one checkbox, no per-person state, same as a
// shared packing item (ROADMAP.md Milestone AE).
export function TodoRow({ todo, relatedPlaceName, onToggle, onEdit }: TodoRowProps) {
  const icsEvent = todoToIcsEvent(todo);

  return (
    <Card>
      <div className="flex items-start justify-between gap-2">
        <label className="flex flex-1 items-start gap-2">
          <input
            type="checkbox"
            checked={todo.is_done}
            onChange={(event) => onToggle(event.target.checked)}
          />
          <span style={todo.is_done ? { textDecoration: "line-through", opacity: 0.6 } : undefined}>
            {todo.text}
          </span>
        </label>
        {icsEvent && (
          <AddToCalendarLink event={icsEvent} filename={`${todo.text}.ics`} iconOnly />
        )}
        <Button
          type="button"
          variant="ghost"
          icon
          onClick={onEdit}
          aria-label={`Edit ${todo.text}`}
        >
          <PencilSimple weight="duotone" size={20} />
        </Button>
      </div>

      {(todo.phase || todo.due_date || relatedPlaceName) && (
        <CardMeta>
          {todo.phase && <Tag variant="accent">{PHASE_LABEL[todo.phase]}</Tag>}
          {todo.due_date && (
            <Tag variant="neutral">
              {formatPlainDate(todo.due_date, { month: "short", day: "numeric" })}
            </Tag>
          )}
          {relatedPlaceName && <Tag variant="outline">{relatedPlaceName}</Tag>}
        </CardMeta>
      )}
    </Card>
  );
}
