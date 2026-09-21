import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { todoSchema, type TodoInput } from "@/lib/validation/todo.schema";
import type { Todo } from "@/types/database.types";

// No offline-snapshot fallback — that's scoped to places/stops/tips/
// fun_facts (ROADMAP.md M6), same as packing_items, which also has none.
export function useTodos(tripId: string) {
  return useQuery({
    queryKey: ["todos", tripId],
    queryFn: async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("todos")
        .select("*")
        .eq("trip_id", tripId)
        .order("created_at");

      if (error) throw error;
      return data as Todo[];
    },
  });
}

export function useAddTodo(tripId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: TodoInput) => {
      const parsed = todoSchema.parse(input);
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Not signed in");

      const { error } = await supabase
        .from("todos")
        .insert({ ...parsed, trip_id: tripId, added_by: user.id });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["todos", tripId] });
    },
  });
}

export function useUpdateTodo(tripId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      todoId,
      ...input
    }: TodoInput & { todoId: string }) => {
      const parsed = todoSchema.parse(input);
      const supabase = createClient();
      const { error } = await supabase
        .from("todos")
        .update(parsed)
        .eq("id", todoId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["todos", tripId] });
    },
  });
}

export function useDeleteTodo(tripId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (todoId: string) => {
      const supabase = createClient();
      const { error } = await supabase.from("todos").delete().eq("id", todoId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["todos", tripId] });
    },
  });
}

// Shared-only completion — single is_done flag, same shape as
// useTogglePackingItem (ROADMAP.md Milestone AE).
export function useToggleTodo(tripId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, isDone }: { id: string; isDone: boolean }) => {
      const supabase = createClient();
      const { error } = await supabase
        .from("todos")
        .update({ is_done: isDone })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["todos", tripId] });
    },
  });
}
