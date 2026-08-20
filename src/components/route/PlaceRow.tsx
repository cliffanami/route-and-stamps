"use client";

import Link from "next/link";
import { Card, CardTitle, CardBody, CardMeta } from "@/components/ui/Card";
import { Tag } from "@/components/ui/Tag";
import { VoteScale, VOTE_LEVEL_LABEL } from "@/components/places/VoteScale";
import { MEAL_TAG_LABEL } from "@/components/places/MealTagPicker";
import { useCastVote } from "@/lib/queries/use-votes";
import type { TripMember } from "@/lib/queries/use-trip-members";
import type { Place, Vote } from "@/types/database.types";

interface PlaceRowProps {
  tripId: string;
  place: Place;
  votes: Vote[];
  currentUserId: string | null;
  members: TripMember[];
}

// Mutual "Must go" (ROADMAP.md M1): every trip member's vote on this place
// is must_go, not just the current user's. Exported so RouteSpine can
// derive a per-stop consensus count for StopCard's collapsed summary
// without duplicating the rule.
export function isMutualMustGo(placeVotes: Vote[], memberIds: string[]): boolean {
  return (
    memberIds.length > 0 &&
    memberIds.every(
      (id) => placeVotes.find((v) => v.user_id === id)?.level === "must_go",
    )
  );
}

export function PlaceRow({
  tripId,
  place,
  votes,
  currentUserId,
  members,
}: PlaceRowProps) {
  const castVote = useCastVote(tripId);
  const placeVotes = votes.filter((v) => v.place_id === place.id);
  const myVote =
    placeVotes.find((v) => v.user_id === currentUserId)?.level ?? null;
  const memberIds = members.map((m) => m.user_id);
  const consensus = isMutualMustGo(placeVotes, memberIds);

  // What the other person voted (data was already fetched trip-wide by
  // useVotes; this is purely a display addition). Members who haven't
  // voted on this specific place yet are omitted rather than shown as a
  // blank "—", since most places start with zero votes from anyone.
  const otherVotes = members
    .filter((m) => m.user_id !== currentUserId)
    .map((m) => ({
      member: m,
      level: placeVotes.find((v) => v.user_id === m.user_id)?.level,
    }))
    .filter((entry) => entry.level !== undefined);

  return (
    <Card>
      <CardTitle>
        <Link href={`/trips/${tripId}/places/${place.id}`}>{place.name}</Link>
      </CardTitle>
      {place.town && <CardMeta>{place.town}</CardMeta>}
      {place.note && <CardBody>{place.note}</CardBody>}
      {consensus && <Tag variant="accent">Mutual must go</Tag>}
      {place.is_accommodation && <Tag variant="neutral">Accommodation</Tag>}
      {place.meal_tags.map((tag) => (
        <Tag key={tag} variant="neutral">
          {MEAL_TAG_LABEL[tag]}
        </Tag>
      ))}
      <VoteScale
        value={myVote}
        onChange={(level) => castVote.mutate({ placeId: place.id, level })}
        disabled={!currentUserId}
      />
      {otherVotes.length > 0 && (
        <CardMeta>
          {otherVotes
            .map(
              (entry) =>
                `${entry.member.displayName}: ${VOTE_LEVEL_LABEL[entry.level!]}`,
            )
            .join(" · ")}
        </CardMeta>
      )}
    </Card>
  );
}
