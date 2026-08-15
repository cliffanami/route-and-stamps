"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { useTips } from "@/lib/queries/use-tips";
import { usePlaces } from "@/lib/queries/use-places";
import { useRealtimeSubscription } from "@/lib/queries/use-realtime-subscription";
import { CategoryFilter } from "./CategoryFilter";
import { TipCard } from "./TipCard";
import { TipForm } from "./TipForm";

interface TipsViewProps {
  tripId: string;
}

export function TipsView({ tripId }: TipsViewProps) {
  const { data: tips = [], isLoading, error } = useTips(tripId);
  const { data: places = [] } = usePlaces(tripId);
  useRealtimeSubscription("tips", tripId);

  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);

  const categories = useMemo(
    () => Array.from(new Set(tips.map((tip) => tip.category))).sort(),
    [tips],
  );
  const visibleTips = selectedCategory
    ? tips.filter((tip) => tip.category === selectedCategory)
    : tips;
  const placeNameById = useMemo(
    () => new Map(places.map((place) => [place.id, place.name])),
    [places],
  );

  return (
    <div className="flex flex-col gap-4 p-6">
      <div className="flex items-center justify-between gap-2">
        <h1>Tips & Advice</h1>
        <Button
          type="button"
          variant="primary"
          onClick={() => setFormOpen(true)}
        >
          Add a tip
        </Button>
      </div>

      {error && (
        <p className="text-muted">
          Couldn&rsquo;t load tips:{" "}
          {error instanceof Error ? error.message : String(error)}
        </p>
      )}

      <CategoryFilter
        categories={categories}
        selected={selectedCategory}
        onChange={setSelectedCategory}
      />

      {isLoading && <p className="text-muted">Loading…</p>}
      {!isLoading && tips.length === 0 && (
        <p className="text-muted">No tips added yet.</p>
      )}

      <div className="flex flex-col gap-3">
        {visibleTips.map((tip) => (
          <TipCard
            key={tip.id}
            tip={tip}
            relatedPlaceName={
              tip.related_place_id
                ? placeNameById.get(tip.related_place_id)
                : undefined
            }
          />
        ))}
      </div>

      <Dialog
        open={formOpen}
        onClose={() => setFormOpen(false)}
        title="Add a tip"
      >
        <TipForm
          tripId={tripId}
          existingCategories={categories}
          onDone={() => setFormOpen(false)}
        />
      </Dialog>
    </div>
  );
}
