"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { useTrip } from "@/lib/queries/use-trip";
import {
  useTogglePackingItem,
  usePackingItems,
} from "@/lib/queries/use-packing-items";
import { useRealtimeSubscription } from "@/lib/queries/use-realtime-subscription";
import { ChecklistItem } from "./ChecklistItem";
import { PackingForm } from "./PackingForm";
import type { PackingItem } from "@/types/database.types";

interface PackingViewProps {
  tripId: string;
}

function Section({
  title,
  items,
  onToggle,
}: {
  title: string;
  items: PackingItem[];
  onToggle: (item: PackingItem, isChecked: boolean) => void;
}) {
  if (items.length === 0) return null;

  return (
    <section className="flex flex-col gap-2">
      <h2>{title}</h2>
      <div className="flex flex-col gap-2">
        {items.map((item) => (
          <ChecklistItem
            key={item.id}
            item={item}
            onToggle={(checked) => onToggle(item, checked)}
          />
        ))}
      </div>
    </section>
  );
}

export function PackingView({ tripId }: PackingViewProps) {
  const { data: trip } = useTrip(tripId);
  const { data: items = [], isLoading, error } = usePackingItems(tripId);
  const toggleItem = useTogglePackingItem(tripId);
  useRealtimeSubscription("packing_items", tripId);

  const [userId, setUserId] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth
      .getUser()
      .then(({ data }) => setUserId(data.user?.id ?? null));
  }, []);

  function handleToggle(item: PackingItem, isChecked: boolean) {
    toggleItem.mutate({ id: item.id, isChecked });
  }

  if (error) {
    return (
      <p className="px-6 py-4 text-muted">
        Couldn&rsquo;t load the packing list:{" "}
        {error instanceof Error ? error.message : String(error)}
      </p>
    );
  }

  if (isLoading) {
    return <p className="px-6 py-4 text-muted">Loading…</p>;
  }

  const shared = items.filter(
    (item) => item.owner_id === null && !item.is_document,
  );
  const mine = items.filter(
    (item) => item.owner_id === userId && !item.is_document,
  );
  const documents = items.filter((item) => item.is_document);

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex items-center justify-between gap-2">
        <h1>Packing</h1>
        <Button
          type="button"
          variant="primary"
          onClick={() => setFormOpen(true)}
          disabled={!userId}
        >
          Add an item
        </Button>
      </div>

      {items.length === 0 && (
        <p className="text-muted">No packing items added yet.</p>
      )}

      <Section title="Trip essentials" items={shared} onToggle={handleToggle} />
      <Section title="My list" items={mine} onToggle={handleToggle} />
      {trip?.is_international && (
        <Section
          title="Visa & Documents"
          items={documents}
          onToggle={handleToggle}
        />
      )}

      {userId && (
        <Dialog
          open={formOpen}
          onClose={() => setFormOpen(false)}
          title="Add a packing item"
        >
          <PackingForm
            tripId={tripId}
            currentUserId={userId}
            onDone={() => setFormOpen(false)}
          />
        </Dialog>
      )}
    </div>
  );
}
