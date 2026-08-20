"use client";

import Link from "next/link";
import { useTrip } from "@/lib/queries/use-trip";
import { TripDetailsForm } from "./TripDetailsForm";
import { TripBudgetSettings } from "@/components/budget/TripBudgetSettings";

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

      <div className="flex flex-col gap-3">
        <h2>Account</h2>
        <Link href="/profile">Profile</Link>
      </div>
    </div>
  );
}
