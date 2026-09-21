"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import { useAddTodo, useUpdateTodo } from "@/lib/queries/use-todos";
import { usePlaces } from "@/lib/queries/use-places";
import { PHASE_LABEL } from "./PhaseFilter";
import type { Todo, TodoPhase } from "@/types/database.types";

interface TodoFormProps {
  tripId: string;
  onDone: () => void;
  todo?: Todo;
  // Place Detail's "Add a todo" button lands here — pre-fills the place
  // link, same as TipForm's initialRelatedPlaceId.
  initialRelatedPlaceId?: string;
}

const PHASES: TodoPhase[] = ["pre_trip", "during_trip", "post_trip"];

// Doubles as the edit form — pass an existing `todo` to prefill and update
// it instead of creating a new one. Place link and phase are both optional,
// independent tags — neither required (ROADMAP.md Milestone AE).
export function TodoForm({
  tripId,
  onDone,
  todo,
  initialRelatedPlaceId,
}: TodoFormProps) {
  const addTodo = useAddTodo(tripId);
  const updateTodo = useUpdateTodo(tripId);
  const { data: places = [] } = usePlaces(tripId);
  const { showToast } = useToast();
  const isEditing = todo !== undefined;

  const [text, setText] = useState(todo?.text ?? "");
  const [phase, setPhase] = useState(todo?.phase ?? "");
  const [dueDate, setDueDate] = useState(todo?.due_date ?? "");
  const [relatedPlaceId, setRelatedPlaceId] = useState(
    todo?.related_place_id ?? initialRelatedPlaceId ?? "",
  );
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);

    const input = {
      text: text.trim(),
      due_date: dueDate || null,
      related_place_id: relatedPlaceId || null,
      phase: (phase || null) as TodoPhase | null,
    };

    try {
      if (isEditing) {
        await updateTodo.mutateAsync({ todoId: todo.id, ...input });
        showToast("Todo updated");
      } else {
        await addTodo.mutateAsync(input);
        showToast("Todo added");
      }
      onDone();
    } catch {
      setError(
        isEditing
          ? "Couldn't save that todo — try again."
          : "Couldn't add that todo — try again.",
      );
    }
  }

  const pending = isEditing ? updateTodo.isPending : addTodo.isPending;

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="field">
        <label htmlFor="todo-text">Todo</label>
        <input
          id="todo-text"
          className="input"
          value={text}
          onChange={(event) => setText(event.target.value)}
          required
        />
      </div>

      <div className="field">
        <label htmlFor="todo-phase">Phase (optional)</label>
        <select
          id="todo-phase"
          className="input"
          value={phase}
          onChange={(event) => setPhase(event.target.value as TodoPhase | "")}
        >
          <option value="">— None —</option>
          {PHASES.map((p) => (
            <option key={p} value={p}>
              {PHASE_LABEL[p]}
            </option>
          ))}
        </select>
      </div>

      <div className="field">
        <label htmlFor="todo-due-date">Due date (optional)</label>
        <input
          id="todo-due-date"
          type="date"
          className="input"
          value={dueDate}
          onChange={(event) => setDueDate(event.target.value)}
        />
      </div>

      {places.length > 0 && (
        <div className="field">
          <label htmlFor="todo-place">Link to a place (optional)</label>
          <select
            id="todo-place"
            className="input"
            value={relatedPlaceId}
            onChange={(event) => setRelatedPlaceId(event.target.value)}
          >
            <option value="">— None —</option>
            {places.map((place) => (
              <option key={place.id} value={place.id}>
                {place.name}
              </option>
            ))}
          </select>
        </div>
      )}

      {error && <p className="text-muted">{error}</p>}

      <Button type="submit" variant="primary" disabled={pending}>
        {pending ? "Saving…" : isEditing ? "Save changes" : "Add todo"}
      </Button>
    </form>
  );
}
