import type { ReactNode } from "react";
import { OpenInGoogleMapsLink } from "@/components/map/OpenInGoogleMapsLink";
import type { Stop } from "@/types/database.types";

interface StopCardProps {
  stop: Stop;
  children: ReactNode;
}

// Not `.card` — a stop is a section of the route, not a discrete list item
// (CONVENTIONS.md §5b reserves .card for things like the PlaceRow cards
// inside it). Hierarchy comes from the type scale and whitespace instead.
export function StopCard({ stop, children }: StopCardProps) {
  return (
    <section className="flex flex-col gap-3">
      <div>
        <h2>{stop.name}</h2>
        {stop.date_label && <p className="text-muted">{stop.date_label}</p>}
        <OpenInGoogleMapsLink lat={stop.lat} lng={stop.lng} />
      </div>
      <div className="flex flex-col gap-3">{children}</div>
    </section>
  );
}
