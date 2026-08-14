"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useStops } from "@/lib/queries/use-stops";
import { usePlaces } from "@/lib/queries/use-places";
import { useVotes } from "@/lib/queries/use-votes";
import { useTripMembers } from "@/lib/queries/use-trip-members";
import { useRealtimeSubscription } from "@/lib/queries/use-realtime-subscription";
import { StopCard } from "./StopCard";
import { PlaceRow } from "./PlaceRow";

interface RouteSpineProps {
  tripId: string;
}

export function RouteSpine({ tripId }: RouteSpineProps) {
  const stopsQuery = useStops(tripId);
  const placesQuery = usePlaces(tripId);
  const votesQuery = useVotes(tripId);
  const membersQuery = useTripMembers(tripId);
  const { data: stops = [], isLoading: stopsLoading } = stopsQuery;
  const { data: places = [] } = placesQuery;
  const { data: votes = [] } = votesQuery;
  const { data: members = [] } = membersQuery;
  useRealtimeSubscription("places", tripId);
  useRealtimeSubscription("votes", tripId);

  const [userId, setUserId] = useState<string | null>(null);
  // Skip is filterable, not removed (ROADMAP.md M1) — defaults to hidden
  // so the route reads clean, but nothing is ever deleted by skipping.
  const [hideSkipped, setHideSkipped] = useState(true);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => setUserId(data.user?.id ?? null));
  }, []);

  const memberIds = members.map((m) => m.user_id);

  const visiblePlaces = hideSkipped
    ? places.filter(
        (place) =>
          votes.find((v) => v.place_id === place.id && v.user_id === userId)?.level !== "skip",
      )
    : places;

  const firstError = [stopsQuery, placesQuery, votesQuery, membersQuery].find(
    (q) => q.error,
  )?.error;

  if (firstError) {
    return (
      <p className="px-6 py-4 text-muted">
        Couldn&rsquo;t load the route: {firstError instanceof Error ? firstError.message : String(firstError)}
      </p>
    );
  }

  if (stopsLoading) {
    return <p className="px-6 py-4 text-muted">Loading…</p>;
  }

  if (stops.length === 0) {
    return <p className="px-6 py-4">No stops yet.</p>;
  }

  const unassigned = visiblePlaces.filter((place) => !place.nearest_stop_id);

  return (
    <div className="flex flex-col gap-8 p-6">
      {places.length === 0 && <p className="text-muted">No places added yet.</p>}

      <label className="field flex flex-row items-center gap-2">
        <input
          type="checkbox"
          checked={hideSkipped}
          onChange={(event) => setHideSkipped(event.target.checked)}
        />
        Hide places I&rsquo;ve skipped
      </label>

      {stops.map((stop) => {
        const stopPlaces = visiblePlaces.filter((place) => place.nearest_stop_id === stop.id);
        return (
          <StopCard key={stop.id} stop={stop}>
            {stopPlaces.length === 0 ? (
              <p className="text-muted">No places here yet.</p>
            ) : (
              stopPlaces.map((place) => (
                <PlaceRow
                  key={place.id}
                  tripId={tripId}
                  place={place}
                  votes={votes}
                  currentUserId={userId}
                  memberIds={memberIds}
                />
              ))
            )}
          </StopCard>
        );
      })}

      {unassigned.length > 0 && (
        <section className="flex flex-col gap-3">
          <h2>Unassigned</h2>
          <div className="flex flex-col gap-3">
            {unassigned.map((place) => (
              <PlaceRow
                key={place.id}
                tripId={tripId}
                place={place}
                votes={votes}
                currentUserId={userId}
                memberIds={memberIds}
              />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
