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
  place_id: string | null;
  stop_id: string | null;
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

// Offline write queue (ROADMAP.md M6): a network failure queues the add
// instead of failing it — validated first, so bad input never gets queued.
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
        place_id: input.place_id,
        stop_id: input.stop_id,
        paid_at: null,
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

const editableFieldsSchema = budgetLineSchema.pick({
  category: true,
  description: true,
  amount_minor: true,
  currency: true,
});

// Editing the loggable fields (category/description/amount/currency) —
// separate from useUpdateBudgetLineStatus/useMarkBudgetLinePaid, which own
// status/paid_at. A partial Supabase update only touches the columns
// given, so the rest are left alone without needing to fetch and re-send
// them first.
export function useUpdateBudgetLine(tripId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      category,
      description,
      amount,
      currency,
    }: {
      id: string;
      category: string;
      description: string;
      amount: string;
      currency: string;
    }) => {
      const parsed = editableFieldsSchema.parse({
        category,
        description,
        amount_minor: toMinorUnits(amount, currency),
        currency,
      });

      const supabase = createClient();
      const { error } = await supabase
        .from("budget_lines")
        .update(parsed)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["budget_lines", tripId] });
    },
  });
}

// Backdating an already-paid line's paid_at (ROADMAP.md's mark-as-paid
// work) — separate from useMarkBudgetLinePaid, which sets both status and
// paid_at together on the initial mark; this only touches the date,
// available once a line is already 'paid'.
export function useUpdateBudgetLinePaidAt(tripId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, paidAt }: { id: string; paidAt: string }) => {
      const supabase = createClient();
      const { error } = await supabase
        .from("budget_lines")
        .update({ paid_at: paidAt })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["budget_lines", tripId] });
    },
  });
}

export function useDeleteBudgetLine(tripId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const supabase = createClient();
      const { error } = await supabase.from("budget_lines").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["budget_lines", tripId] });
    },
  });
}

// Tap-to-cycle no longer reaches "paid" (ROADMAP.md's mark-as-paid work) —
// only not_booked <-> pending, since reaching "paid" now needs the
// explicit Mark-as-paid action that also records paid_at. From "paid",
// tapping steps back to not_booked (an undo), clearing paid_at via the
// same mutation below rather than leaving a stale date on an unpaid line.
export const STATUS_CYCLE: Record<BudgetStatus, BudgetStatus> = {
  not_booked: "pending",
  pending: "not_booked",
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
        // Any status other than "paid" means paid_at is meaningless —
        // clear it here rather than only in the dedicated undo path, so
        // this stays correct regardless of which caller changes status.
        .update({ status, paid_at: status === "paid" ? undefined : null })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["budget_lines", tripId] });
    },
  });
}

// The real feature paid_at was added for — sets status='paid' and paid_at
// to today in one action, distinct from the tap-cycle (ROADMAP.md's
// mark-as-paid work). paid_at stays editable afterward via
// useUpdateBudgetLinePaidAt, for a backdated entry.
export function useMarkBudgetLinePaid(tripId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const supabase = createClient();
      const today = new Date().toISOString().slice(0, 10);
      const { error } = await supabase
        .from("budget_lines")
        .update({ status: "paid", paid_at: today })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["budget_lines", tripId] });
    },
  });
}
