"use client";

import { useState, type ReactNode } from "react";
import { PencilSimple } from "@phosphor-icons/react";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { StopLogisticsForm } from "./StopLogisticsForm";
import { OpenInGoogleMapsLink } from "@/components/map/OpenInGoogleMapsLink";
import type { Stop } from "@/types/database.types";

interface StopCardProps {
  tripId: string;
  stop: Stop;
  children: ReactNode;
}

const LOGISTICS_FIELDS = [
  { key: "hotel_info", label: "Hotel" },
  { key: "meals_info", label: "Meals" },
  { key: "guide_info", label: "Guide" },
  { key: "flight_info", label: "Flight" },
] as const;

// Not `.card` — a stop is a section of the route, not a discrete list item
// (CONVENTIONS.md §5b reserves .card for things like the PlaceRow cards
// inside it). Hierarchy comes from the type scale and whitespace instead.
export function StopCard({ tripId, stop, children }: StopCardProps) {
  const [editing, setEditing] = useState(false);
  // Loose check, not `!== null` — if 0003_budget_logistics.sql hasn't run
  // yet on a given environment, these columns are absent from the row
  // entirely (undefined), not null, and a strict check let that render as
  // a blank "Hotel: " row.
  const logisticsEntries = LOGISTICS_FIELDS.map((field) => ({
    ...field,
    value: stop[field.key],
  })).filter((field) => field.value != null);

  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h2>{stop.name}</h2>
          {stop.date_label && <p className="text-muted">{stop.date_label}</p>}
          {logisticsEntries.map((field) => (
            <p key={field.key} className="text-muted">
              {field.label}: {field.value}
            </p>
          ))}
          <OpenInGoogleMapsLink lat={stop.lat} lng={stop.lng} />
        </div>
        <Button
          type="button"
          variant="ghost"
          icon
          onClick={() => setEditing(true)}
          aria-label="Edit logistics"
        >
          <PencilSimple weight="duotone" size={20} />
        </Button>
      </div>
      <div className="flex flex-col gap-3">{children}</div>

      <Dialog
        open={editing}
        onClose={() => setEditing(false)}
        title={`${stop.name} logistics`}
      >
        <StopLogisticsForm
          tripId={tripId}
          stop={stop}
          onDone={() => setEditing(false)}
        />
      </Dialog>
    </section>
  );
}
