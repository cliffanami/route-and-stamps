import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import {
  budgetLineSchema,
  type BudgetLineInput,
} from "@/lib/validation/budget-line.schema";
import { toMinorUnits } from "@/lib/money/currency";
import { enqueue, isNetworkError } from "@/lib/offline/sync-queue";
import type { BudgetLine, BudgetStatus } from "@/types/database.types";

export function useBudgetLines(tripId: string) {
  return useQuery({
    queryKey: ["budget_lines", tripId],
    queryFn: async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("budget_lines")
        .select("*")
        .eq("trip_id", tripId)
        .order("created_at");

      if (error) throw error;
      return data as BudgetLine[];
    },
  });
}

interface AddBudgetLineInput {
  category: string;
  description: string;
  amount: string; // decimal string from the form — converted via toMinorUnits
  currency: string;
  status: BudgetStatus;
  paid_by: string | null;
  payment_details: string | null;
  due_date: string | null;
}

// Factored out so both the mutation below and the offline drain handler
// (lib/offline/sync-provider.tsx) call the exact same insert logic.
export async function insertBudgetLine(
  tripId: string,
  parsed: BudgetLineInput,
): Promise<void> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not signed in");

  const { error } = await supabase
    .from("budget_lines")
    .insert({ ...parsed, trip_id: tripId, created_by: user.id });

  if (error) throw error;
}

// Offline write queue (ROADMAP.md M6) — same network-failure-queues-it
// pattern as useAddPlace. The amount is converted to minor units (and
// validated) before queueing, so the queued payload is already the exact
// shape insertBudgetLine expects — no currency math re-run on replay.
export function useAddBudgetLine(tripId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: AddBudgetLineInput) => {
      const parsed: BudgetLineInput = budgetLineSchema.parse({
        category: input.category,
        description: input.description,
        amount_minor: toMinorUnits(input.amount, input.currency),
        currency: input.currency,
        status: input.status,
        paid_by: input.paid_by,
        payment_details: input.payment_details,
        due_date: input.due_date,
      });

      try {
        await insertBudgetLine(tripId, parsed);
        return true;
      } catch (error) {
        if (isNetworkError(error)) {
          await enqueue({ type: "add_budget_line", tripId, payload: parsed });
          queryClient.invalidateQueries({ queryKey: ["sync-queue-count"] });
          return false;
        }
        throw error;
      }
    },
    onSuccess: (synced) => {
      if (synced)
        queryClient.invalidateQueries({ queryKey: ["budget_lines", tripId] });
    },
  });
}

export const STATUS_CYCLE: Record<BudgetStatus, BudgetStatus> = {
  not_booked: "pending",
  pending: "paid",
  paid: "not_booked",
};

export function useUpdateBudgetLineStatus(tripId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      status,
    }: {
      id: string;
      status: BudgetStatus;
    }) => {
      const supabase = createClient();
      const { error } = await supabase
        .from("budget_lines")
        .update({ status })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["budget_lines", tripId] });
    },
  });
}
