"use client";

import { Card, CardTitle, CardBody, CardMeta } from "@/components/ui/Card";
import { Tag } from "@/components/ui/Tag";
import { VoteScale } from "@/components/places/VoteScale";
import { useCastVote } from "@/lib/queries/use-votes";
import type { Place, Vote } from "@/types/database.types";

interface PlaceRowProps {
  tripId: string;
  place: Place;
  votes: Vote[];
  currentUserId: string | null;
  memberIds: string[];
}

export function PlaceRow({ tripId, place, votes, currentUserId, memberIds }: PlaceRowProps) {
  const castVote = useCastVote(tripId);
  const placeVotes = votes.filter((v) => v.place_id === place.id);
  const myVote = placeVotes.find((v) => v.user_id === currentUserId)?.level ?? null;

  // Mutual "Must go" (ROADMAP.md M1): every trip member's vote on this
  // place is must_go, not just the current user's.
  const consensus =
    memberIds.length > 0 &&
    memberIds.every((id) => placeVotes.find((v) => v.user_id === id)?.level === "must_go");

  return (
    <Card>
      <CardTitle>{place.name}</CardTitle>
      {place.town && <CardMeta>{place.town}</CardMeta>}
      {place.note && <CardBody>{place.note}</CardBody>}
      {consensus && <Tag variant="accent">Mutual must go</Tag>}
      <VoteScale
        value={myVote}
        onChange={(level) => castVote.mutate({ placeId: place.id, level })}
        disabled={!currentUserId}
      />
    </Card>
  );
}
