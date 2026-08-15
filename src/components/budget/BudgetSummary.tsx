"use client";

import { useMemo } from "react";
import { formatMinor, toMinorUnits } from "@/lib/money/currency";
import type { BudgetLine, Trip } from "@/types/database.types";

interface BudgetSummaryProps {
  trip: Trip;
  lines: BudgetLine[];
}

// Per-currency totals shown side by side, never blended (ROADMAP.md M4
// acceptance criterion) — grouping by currency, not converting, is the
// entire point. Only the cap-currency group ever gets compared against
// trip.budget_cap; every other currency is just an independent total.
export function BudgetSummary({ trip, lines }: BudgetSummaryProps) {
  const totalsByCurrency = useMemo(() => {
    const totals = new Map<string, number>();
    for (const line of lines) {
      totals.set(
        line.currency,
        (totals.get(line.currency) ?? 0) + line.amount_minor,
      );
    }
    return totals;
  }, [lines]);

  if (totalsByCurrency.size === 0) {
    return <p className="text-muted">No costs logged yet.</p>;
  }

  return (
    <div className="flex flex-col gap-2">
      {Array.from(totalsByCurrency.entries()).map(([currency, totalMinor]) => {
        const isCapCurrency =
          trip.budget_mode === "cap" && trip.budget_cap_currency === currency;
        const capMinor =
          isCapCurrency && trip.budget_cap !== null
            ? toMinorUnits(String(trip.budget_cap), currency)
            : null;
        const overCap = capMinor !== null && totalMinor > capMinor;

        return (
          <div
            key={currency}
            className="flex items-baseline justify-between gap-2"
          >
            <span>{currency}</span>
            <span
              style={overCap ? { color: "var(--color-accent-2)" } : undefined}
            >
              {formatMinor(totalMinor, currency)}
              {capMinor !== null && (
                <> of {formatMinor(capMinor, currency)} cap</>
              )}
            </span>
          </div>
        );
      })}
    </div>
  );
}
