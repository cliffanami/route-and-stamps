// Currency minor-unit math (PRD §12c data-correctness NFR, ROADMAP.md M4) —
// amount_minor is a bare integer, and the number of minor units per major
// unit isn't a flat 100: JPY has 0 decimal places, KES/USD have 2, some
// currencies have 3. Deriving the exponent from Intl's own currency data
// (via resolvedOptions) avoids hand-maintaining a currency table that would
// silently go stale or be wrong for a currency this app hasn't seen yet.

const DEFAULT_EXPONENT = 2; // ISO 4217's fallback for an unrecognized code

export function minorUnitExponent(currency: string): number {
  try {
    const { maximumFractionDigits } = new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
    }).resolvedOptions();
    return maximumFractionDigits ?? DEFAULT_EXPONENT;
  } catch {
    return DEFAULT_EXPONENT;
  }
}

export function formatMinor(amountMinor: number, currency: string): string {
  const exponent = minorUnitExponent(currency);
  const majorAmount = amountMinor / 10 ** exponent;
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
    }).format(majorAmount);
  } catch {
    return `${majorAmount.toFixed(exponent)} ${currency}`;
  }
}

// Converts a form's decimal-string amount (e.g. "45.00", or "12345" for a
// zero-decimal currency like JPY) into integer minor units for storage.
// Float-multiply-then-round is standard practice at this precision/scale —
// not a high-frequency fintech ledger, just a trip cost tracker.
export function toMinorUnits(
  majorAmountInput: string,
  currency: string,
): number {
  const exponent = minorUnitExponent(currency);
  const parsed = Number.parseFloat(majorAmountInput);
  return Math.round(parsed * 10 ** exponent);
}

// The inverse of toMinorUnits — prefills an editable amount field from a
// stored value (e.g. BudgetForm's edit mode). Deliberately a plain decimal
// string, not formatMinor's currency-symbol display string, since this
// feeds back into the same input toMinorUnits will parse on save.
export function minorToDecimalString(
  amountMinor: number,
  currency: string,
): string {
  const exponent = minorUnitExponent(currency);
  return (amountMinor / 10 ** exponent).toFixed(exponent);
}
