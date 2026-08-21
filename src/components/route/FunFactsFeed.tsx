"use client";

import { useState } from "react";
import { Sparkle, Plus } from "@phosphor-icons/react";
import { Card, CardKicker, CardBody } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { useFunFacts, useAutoFetchFunFacts } from "@/lib/queries/use-fun-facts";
import { useStops } from "@/lib/queries/use-stops";
import { usePlaces } from "@/lib/queries/use-places";
import { useTripMembers } from "@/lib/queries/use-trip-members";
import { FunFactForm } from "./FunFactForm";

interface FunFactsFeedProps {
  tripId: string;
}

// A small rotating strip, not the whole table at once (ROADMAP.md
// Milestone F) — picks one fact at random, re-picking whenever the query
// resolves (mount, and again every 15 minutes via useFunFacts's own
// refetchInterval). The re-pick is keyed on dataUpdatedAt so it only
// happens when a fetch actually completed, not on every unrelated render.
export function FunFactsFeed({ tripId }: FunFactsFeedProps) {
  const { data: facts = [], dataUpdatedAt } = useFunFacts(tripId);
  const { data: stops = [] } = useStops(tripId);
  const { data: places = [] } = usePlaces(tripId);
  const { data: members = [] } = useTripMembers(tripId);
  const [adding, setAdding] = useState(false);

  useAutoFetchFunFacts(tripId, stops, facts);

  // Math.random() is impure and can't run during render (React Compiler's
  // purity rule) — dataUpdatedAt (a millisecond timestamp that changes on
  // every fetch, including the 15-minute refetchInterval one) stands in
  // for it instead: a pure, deterministic index that still changes on
  // every refetch, reshuffling which fact shows even when the underlying
  // set of facts is unchanged, per the acceptance criterion.
  const shownFact = facts.length > 0 ? facts[dataUpdatedAt % facts.length] : null;

  const attribution =
    shownFact?.source === "wikipedia"
      ? "via Wikipedia"
      : shownFact
        ? `Shared by ${members.find((m) => m.user_id === shownFact.added_by)?.displayName ?? "a trip member"}`
        : null;

  return (
    <div className="flex flex-col gap-2">
      {shownFact && (
        <Card>
          <CardKicker>
            <Sparkle weight="duotone" size={16} />
            Fun fact
          </CardKicker>
          <CardBody>{shownFact.body}</CardBody>
          {attribution && <p className="text-muted">{attribution}</p>}
        </Card>
      )}

      <Button type="button" variant="ghost" onClick={() => setAdding(true)}>
        <Plus weight="duotone" size={18} />
        Add a fact
      </Button>

      <Dialog open={adding} onClose={() => setAdding(false)} title="Add a fact">
        <FunFactForm
          tripId={tripId}
          places={places}
          stops={stops}
          onDone={() => setAdding(false)}
        />
      </Dialog>
    </div>
  );
}
