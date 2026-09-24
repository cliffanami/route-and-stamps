"use client";

import { useMemo } from "react";
import { formatMinor, toMinorUnits } from "@/lib/money/currency";
import { Tag } from "@/components/ui/Tag";
import type { BudgetLine, Trip } from "@/types/database.types";

interface BudgetSummaryProps {
  trip: Trip;
  lines: BudgetLine[];
  selectedCurrency: string | null;
  onSelectCurrency: (currency: string) => void;
}

// Per-currency totals shown side by side, never blended (ROADMAP.md M4
// acceptance criterion) — grouping by currency, not converting, is the
// entire point. Paid vs. logged is a second, independent split within
// each currency (ROADMAP.md's mark-as-paid work: "¥X paid of ¥Y logged",
// not one blended figure) — logged is every line regardless of status,
// paid is only what Mark-as-paid actually confirmed. The cap still
// compares against the logged total, since a cap is about total
// commitment, not just what's been paid out so far.
//
// Each row is a toggle, not just a display — tapping a currency filters
// the cost list below to just that currency's lines (BudgetView owns the
// selection state); tapping the same currency again clears it. Live-usage
// feedback: with JPY/USD/KES all logged on one trip, finding "what made up
// this figure" meant scrolling the whole flat list by eye.
export function BudgetSummary({
  trip,
  lines,
  selectedCurrency,
  onSelectCurrency,
}: BudgetSummaryProps) {
  const totalsByCurrency = useMemo(() => {
    const totals = new Map<string, { logged: number; paid: number }>();
    for (const line of lines) {
      const entry = totals.get(line.currency) ?? { logged: 0, paid: 0 };
      entry.logged += line.amount_minor;
      if (line.status === "paid") entry.paid += line.amount_minor;
      totals.set(line.currency, entry);
    }
    return totals;
  }, [lines]);

  if (totalsByCurrency.size === 0) {
    return <p className="text-muted">No costs logged yet.</p>;
  }

  return (
    <div className="flex flex-col gap-2">
      {Array.from(totalsByCurrency.entries()).map(([currency, { logged, paid }]) => {
        const isCapCurrency =
          trip.budget_mode === "cap" && trip.budget_cap_currency === currency;
        const capMinor =
          isCapCurrency && trip.budget_cap !== null
            ? toMinorUnits(String(trip.budget_cap), currency)
            : null;
        const overCap = capMinor !== null && logged > capMinor;

        const isSelected = selectedCurrency === currency;

        return (
          <button
            key={currency}
            type="button"
            onClick={() => onSelectCurrency(currency)}
            aria-pressed={isSelected}
            className="flex items-baseline justify-between gap-2 text-left"
            style={isSelected ? { color: "var(--color-accent)" } : undefined}
          >
            <span>{currency}</span>
            <span className="flex items-baseline gap-2">
              <span
                style={overCap ? { color: "var(--color-accent-2)" } : undefined}
              >
                {formatMinor(paid, currency)} paid of {formatMinor(logged, currency)} logged
                {capMinor !== null && (
                  <> ({formatMinor(capMinor, currency)} cap)</>
                )}
              </span>
              {overCap && <Tag variant="accent-2">Over cap</Tag>}
            </span>
          </button>
        );
      })}
    </div>
  );
}
