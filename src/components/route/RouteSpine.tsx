"use client";

import { useState } from "react";
import { PlusCircle } from "@phosphor-icons/react";
import { useTrip } from "@/lib/queries/use-trip";
import { useStops } from "@/lib/queries/use-stops";
import { usePlaces } from "@/lib/queries/use-places";
import { useVotes } from "@/lib/queries/use-votes";
import { useStopCheckins } from "@/lib/queries/use-stop-checkins";
import { usePlaceCheckins } from "@/lib/queries/use-place-checkins";
import { useTripMembers } from "@/lib/queries/use-trip-members";
import { useCurrentUserId } from "@/lib/queries/use-current-user";
import { useRealtimeSubscription } from "@/lib/queries/use-realtime-subscription";
import { sortStopsByDate } from "@/lib/geo/sort-stops-by-date";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { StopCard } from "./StopCard";
import { PlaceRow, isMutualMustGo } from "./PlaceRow";
import { AddStopForm } from "./AddStopForm";
import { FunFactsFeed } from "./FunFactsFeed";
import { ItineraryView } from "./ItineraryView";
import { MustGoDatePrompt } from "./MustGoDatePrompt";
import { TomorrowBanner } from "./TomorrowBanner";
import type { Place } from "@/types/database.types";

interface RouteSpineProps {
  tripId: string;
}

export function RouteSpine({ tripId }: RouteSpineProps) {
  const { data: trip } = useTrip(tripId);
  const stopsQuery = useStops(tripId);
  const placesQuery = usePlaces(tripId);
  const votesQuery = useVotes(tripId);
  const membersQuery = useTripMembers(tripId);
  const { data: stops = [], isLoading: stopsLoading } = stopsQuery;
  const { data: places = [] } = placesQuery;
  const { data: votes = [] } = votesQuery;
  const { data: members = [] } = membersQuery;
  const { data: checkins = [] } = useStopCheckins(tripId);
  const { data: placeCheckins = [] } = usePlaceCheckins(tripId);
  useRealtimeSubscription("places", tripId);
  useRealtimeSubscription("votes", tripId);

  const userId = useCurrentUserId();
  // Skip is filterable, not removed (ROADMAP.md M1) — defaults to shown
  // so a skip doesn't silently vanish a place from the route; hiding is an
  // opt-in declutter, not the default view.
  const [hideSkipped, setHideSkipped] = useState(false);
  const [addingStop, setAddingStop] = useState(false);
  const [datePromptPlace, setDatePromptPlace] = useState<Place | null>(null);

  const memberIds = members.map((m) => m.user_id);

  const visiblePlaces = hideSkipped
    ? places.filter(
        (place) =>
          votes.find((v) => v.place_id === place.id && v.user_id === userId)
            ?.level !== "skip",
      )
    : places;

  const firstError = [stopsQuery, placesQuery, votesQuery, membersQuery].find(
    (q) => q.error,
  )?.error;

  if (firstError) {
    return (
      <p className="px-6 py-4 text-muted">
        Couldn&rsquo;t load the route:{" "}
        {firstError instanceof Error ? firstError.message : String(firstError)}
      </p>
    );
  }

  if (stopsLoading) {
    return <p className="px-6 py-4 text-muted">Loading…</p>;
  }

  const unassigned = visiblePlaces.filter((place) => !place.nearest_stop_id);
  // Chronological, not insertion order (ROADMAP.md Milestone C's
  // date-based-ordering pivot) — a stop added out of sequence (e.g.
  // realizing a layover belongs before the first stop) still shows in the
  // right place without needing a drag interaction.
  const orderedStops = sortStopsByDate(stops);

  return (
    <div className="flex flex-col gap-8 p-6">
      {trip && (
        <div className="flex flex-col gap-1">
          <h1>{trip.name}</h1>
          {trip.description && <p className="text-muted">{trip.description}</p>}
        </div>
      )}

      <TomorrowBanner tripId={tripId} places={places} />

      <FunFactsFeed tripId={tripId} />

      {places.length === 0 && (
        <p className="text-muted">No places added yet.</p>
      )}

      <div className="flex items-center justify-between gap-2">
        <label className="field flex flex-row items-center gap-2">
          <input
            type="checkbox"
            checked={hideSkipped}
            onChange={(event) => setHideSkipped(event.target.checked)}
          />
          Hide places I&rsquo;ve skipped
        </label>
        <Button type="button" variant="secondary" onClick={() => setAddingStop(true)}>
          <PlusCircle weight="duotone" size={20} />
          Add stop
        </Button>
      </div>

      {stops.length === 0 && (
        <p className="text-muted">No stops yet.</p>
      )}

      {orderedStops.map((stop) => {
        const stopPlaces = visiblePlaces.filter(
          (place) => place.nearest_stop_id === stop.id,
        );
        const consensusCount = stopPlaces.filter((place) =>
          isMutualMustGo(
            votes.filter((v) => v.place_id === place.id),
            memberIds,
          ),
        ).length;

        return (
          <StopCard
            key={stop.id}
            tripId={tripId}
            stop={stop}
            places={stopPlaces}
            consensusCount={consensusCount}
            checkins={checkins}
            placeCheckins={placeCheckins}
          >
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
                  members={members}
                  onMustGoConsensus={setDatePromptPlace}
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
                members={members}
                onMustGoConsensus={setDatePromptPlace}
              />
            ))}
          </div>
        </section>
      )}

      <ItineraryView tripId={tripId} places={places} />

      <MustGoDatePrompt
        tripId={tripId}
        place={datePromptPlace}
        onClose={() => setDatePromptPlace(null)}
      />

      <Dialog
        open={addingStop}
        onClose={() => setAddingStop(false)}
        title="Add a stop"
      >
        <AddStopForm tripId={tripId} onDone={() => setAddingStop(false)} />
      </Dialog>
    </div>
  );
}
