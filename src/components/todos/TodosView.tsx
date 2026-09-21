"use client";

import { useMemo, useState } from "react";
import { Trash } from "@phosphor-icons/react";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { DeleteConfirmDialog } from "@/components/ui/DeleteConfirmDialog";
import { useTodos, useDeleteTodo, useToggleTodo } from "@/lib/queries/use-todos";
import { usePlaces } from "@/lib/queries/use-places";
import { useRealtimeSubscription } from "@/lib/queries/use-realtime-subscription";
import { PhaseFilter } from "./PhaseFilter";
import { TodoRow } from "./TodoRow";
import { TodoForm } from "./TodoForm";
import type { Todo, TodoPhase } from "@/types/database.types";

interface TodosViewProps {
  tripId: string;
}

// Self-contained, same posture as TipsView — owns its own add/edit dialog
// and delete-confirm, rather than delegating "Add" to DetailTabs' onAdd,
// since it's embedded as one tab's content on the Checklists page rather
// than being the page itself (ROADMAP.md Milestone AE).
export function TodosView({ tripId }: TodosViewProps) {
  const { data: todos = [], isLoading, error } = useTodos(tripId);
  const { data: places = [] } = usePlaces(tripId);
  const deleteTodo = useDeleteTodo(tripId);
  const toggleTodo = useToggleTodo(tripId);
  useRealtimeSubscription("todos", tripId);

  const [selectedPhase, setSelectedPhase] = useState<TodoPhase | null>(null);
  const [addingTodo, setAddingTodo] = useState(false);
  const [editingTodo, setEditingTodo] = useState<Todo | null>(null);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const visibleTodos = selectedPhase
    ? todos.filter((todo) => todo.phase === selectedPhase)
    : todos;
  const placeNameById = useMemo(
    () => new Map(places.map((place) => [place.id, place.name])),
    [places],
  );

  const dialogOpen = addingTodo || editingTodo !== null;
  function closeDialog() {
    setAddingTodo(false);
    setEditingTodo(null);
  }

  async function handleDelete() {
    if (!editingTodo) return;
    setDeleteError(null);
    try {
      await deleteTodo.mutateAsync(editingTodo.id);
      setConfirmingDelete(false);
      closeDialog();
    } catch (err) {
      setDeleteError(
        err instanceof Error ? err.message : "Couldn't delete that todo — try again.",
      );
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-2">
        <PhaseFilter selected={selectedPhase} onChange={setSelectedPhase} />
        <Button type="button" variant="secondary" onClick={() => setAddingTodo(true)}>
          Add a todo
        </Button>
      </div>

      {error && (
        <p className="text-muted">
          Couldn&rsquo;t load todos:{" "}
          {error instanceof Error ? error.message : String(error)}
        </p>
      )}

      {isLoading && <p className="text-muted">Loading…</p>}
      {!isLoading && todos.length === 0 && (
        <p className="text-muted">No todos added yet.</p>
      )}

      <div className="flex flex-col gap-3">
        {visibleTodos.map((todo) => (
          <TodoRow
            key={todo.id}
            todo={todo}
            relatedPlaceName={
              todo.related_place_id
                ? placeNameById.get(todo.related_place_id)
                : undefined
            }
            onToggle={(isDone) => toggleTodo.mutate({ id: todo.id, isDone })}
            onEdit={() => setEditingTodo(todo)}
          />
        ))}
      </div>

      <Dialog
        open={dialogOpen}
        onClose={closeDialog}
        title={editingTodo ? "Edit todo" : "Add a todo"}
      >
        <div className="flex flex-col gap-4">
          <TodoForm tripId={tripId} todo={editingTodo ?? undefined} onDone={closeDialog} />
          {editingTodo && (
            <Button
              type="button"
              variant="secondary"
              onClick={() => setConfirmingDelete(true)}
            >
              <Trash weight="duotone" size={20} />
              Delete todo
            </Button>
          )}
        </div>
      </Dialog>

      <DeleteConfirmDialog
        open={confirmingDelete}
        onClose={() => setConfirmingDelete(false)}
        onConfirm={handleDelete}
        title="Delete this todo?"
        description="This can't be undone."
        pending={deleteTodo.isPending}
        error={deleteError}
      />
    </div>
  );
}
