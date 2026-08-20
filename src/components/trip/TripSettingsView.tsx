"use client";

import Link from "next/link";
import { useTrip, useUpdateTripCategoryConfig } from "@/lib/queries/use-trip";
import { useToast } from "@/components/ui/Toast";
import { TripDetailsForm } from "./TripDetailsForm";
import { TagListEditor } from "./TagListEditor";
import { TripBudgetSettings } from "@/components/budget/TripBudgetSettings";
import type { TripCategoryConfigInput } from "@/lib/validation/trip-category-config.schema";
import type { Trip } from "@/types/database.types";

interface TripSettingsViewProps {
  tripId: string;
}

// New in ROADMAP.md Milestone A — pulls budget-cap config off the Budget
// page (where it was originally bolted on, per that component's own
// comment) into one place, alongside the trip's name/description/dates and
// a way to actually reach the Profile page, which nothing else links to.
export function TripSettingsView({ tripId }: TripSettingsViewProps) {
  const { data: trip, isLoading, error } = useTrip(tripId);

  if (error) {
    return (
      <p className="px-6 py-4 text-muted">
        Couldn&rsquo;t load trip settings:{" "}
        {error instanceof Error ? error.message : String(error)}
      </p>
    );
  }

  if (isLoading || !trip) {
    return <p className="px-6 py-4 text-muted">Loading…</p>;
  }

  return (
    <div className="flex flex-col gap-8 p-6">
      <h1>Trip Settings</h1>

      <TripDetailsForm tripId={tripId} trip={trip} />

      <div className="flex flex-col gap-3">
        <h2>Budget</h2>
        <TripBudgetSettings tripId={tripId} trip={trip} />
      </div>

      <CategoryConfigSection tripId={tripId} trip={trip} />

      <div className="flex flex-col gap-3">
        <h2>Account</h2>
        <Link href="/profile">Profile</Link>
      </div>
    </div>
  );
}

// Backs the strict currency/category selects elsewhere in the app (budget
// cap, cost lines, tips) — each list auto-saves through the same full-row
// mutation on every add/remove (ROADMAP.md Milestone A follow-up).
function CategoryConfigSection({ tripId, trip }: { tripId: string; trip: Trip }) {
  const updateCategoryConfig = useUpdateTripCategoryConfig(tripId);
  const { showToast } = useToast();

  function save(next: Partial<TripCategoryConfigInput>) {
    updateCategoryConfig.mutate(
      {
        currencies: trip.currencies,
        tip_categories: trip.tip_categories,
        budget_categories: trip.budget_categories,
        ...next,
      },
      { onError: () => showToast("Couldn't save — try again.") },
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <h2>Currencies &amp; categories</h2>
      <p className="text-muted">
        These lists back the dropdowns on the budget cap, cost lines, and
        tips — only values added here can be selected.
      </p>

      <TagListEditor
        label="Currencies"
        values={trip.currencies}
        onChange={(currencies) => save({ currencies })}
        placeholder="KES"
        normalize={(v) => v.trim().toUpperCase()}
        validate={(v) =>
          v.length === 3 ? null : "Use a 3-letter currency code, e.g. KES"
        }
      />

      <TagListEditor
        label="Tip categories"
        values={trip.tip_categories}
        onChange={(tip_categories) => save({ tip_categories })}
        placeholder="Food"
      />

      <TagListEditor
        label="Budget categories"
        values={trip.budget_categories}
        onChange={(budget_categories) => save({ budget_categories })}
        placeholder="Activities"
      />
    </div>
  );
}
