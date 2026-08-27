"use client";

import Link from "next/link";
import { Card, CardTitle, CardBody, CardMeta } from "@/components/ui/Card";
import { MarkdownText } from "@/components/ui/MarkdownText";
import { formatPlainDate } from "@/lib/text/format-plain-date";
import { Tag } from "@/components/ui/Tag";
import { VoteScale, VOTE_LEVEL_LABEL } from "@/components/places/VoteScale";
import { MEAL_TAG_LABEL } from "@/components/places/MealTagPicker";
import { OpenInGoogleMapsLink } from "@/components/map/OpenInGoogleMapsLink";
import { useCastVote } from "@/lib/queries/use-votes";
import type { TripMember } from "@/lib/queries/use-trip-members";
import type { Place, Vote } from "@/types/database.types";

interface PlaceRowProps {
  tripId: string;
  place: Place;
  votes: Vote[];
  currentUserId: string | null;
  members: TripMember[];
  // Fires only on the not-mutual → mutual "must go" transition (ROADMAP.md
  // Milestone W), not on every vote — mirrors CheckInControl's onCheckedIn
  // shape: captured synchronously from the votes already in scope here,
  // before the mutation lands, since neither the mutation nor its generic
  // hook knows about must-go semantics.
  onMustGoConsensus?: (place: Place) => void;
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
  onMustGoConsensus,
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
      {place.note && <CardBody><MarkdownText text={place.note} /></CardBody>}
      {consensus && <Tag variant="accent">Mutual must go</Tag>}
      {place.date && (
        <Tag variant="neutral">
          {formatPlainDate(place.date, { weekday: "short", month: "short", day: "numeric" })}
        </Tag>
      )}
      {place.is_accommodation && <Tag variant="neutral">Accommodation</Tag>}
      {place.meal_tags.map((tag) => (
        <Tag key={tag} variant="neutral">
          {MEAL_TAG_LABEL[tag]}
        </Tag>
      ))}
      {place.lat !== null && place.lng !== null && (
        <OpenInGoogleMapsLink lat={place.lat} lng={place.lng} />
      )}
      <VoteScale
        value={myVote}
        onChange={(level) => {
          const wasConsensus = consensus;
          const nextVotes = currentUserId
            ? placeVotes.some((v) => v.user_id === currentUserId)
              ? placeVotes.map((v) =>
                  v.user_id === currentUserId ? { ...v, level } : v,
                )
              : [
                  ...placeVotes,
                  { place_id: place.id, user_id: currentUserId, level, updated_at: "" },
                ]
            : placeVotes;
          const willBeConsensus = isMutualMustGo(nextVotes, memberIds);
          castVote.mutate(
            { placeId: place.id, level },
            {
              onSuccess: () => {
                if (!wasConsensus && willBeConsensus) onMustGoConsensus?.(place);
              },
            },
          );
        }}
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
