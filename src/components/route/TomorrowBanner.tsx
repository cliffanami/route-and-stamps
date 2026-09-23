"use client";

import Link from "next/link";
import { Card } from "@/components/ui/Card";
import type { Place, Stop, Todo } from "@/types/database.types";

interface TomorrowBannerProps {
  tripId: string;
  places: Place[];
  stops: Stop[];
  todos: Todo[];
}

function tomorrowDateString() {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

// "What's planned for tomorrow, visible to the whole team" (ROADMAP.md
// Milestone X) — reads places' own dates (Milestone W). Extended with
// stops (an arrival headline when tomorrow is a travel day) and todos due
// tomorrow — live-usage feedback: a luggage-forwarding action item is
// exactly the kind of thing this banner should surface, not just place
// visits. Still just existing fields on places/stops/todos, no new
// infrastructure. The daily push notification version of this same ask
// was explicitly deferred; this banner is the only surfacing for now.
export function TomorrowBanner({ tripId, places, stops, todos }: TomorrowBannerProps) {
  const tomorrow = tomorrowDateString();
  const arrivingStop = stops.find((stop) => stop.start_date === tomorrow);
  const tomorrowPlaces = places.filter((place) => place.date === tomorrow);
  const tomorrowTodos = todos.filter(
    (todo) => todo.due_date === tomorrow && !todo.is_done,
  );

  if (!arrivingStop && tomorrowPlaces.length === 0 && tomorrowTodos.length === 0) {
    return null;
  }

  return (
    <Card elevation="md">
      <h2>Tomorrow</h2>
      {arrivingStop && (
        <p>
          Arriving in{" "}
          <Link href={`/trips/${tripId}/stops/${arrivingStop.id}`}>
            {arrivingStop.name}
          </Link>
        </p>
      )}
      {tomorrowPlaces.length > 0 && (
        <div className="flex flex-col gap-1">
          {tomorrowPlaces.map((place) => (
            <Link key={place.id} href={`/trips/${tripId}/places/${place.id}`}>
              {place.name}
            </Link>
          ))}
        </div>
      )}
      {tomorrowTodos.length > 0 && (
        <div className="flex flex-col gap-1">
          {tomorrowTodos.map((todo) => (
            <p key={todo.id} className="text-muted">
              ☐ {todo.text}
            </p>
          ))}
        </div>
      )}
    </Card>
  );
}
