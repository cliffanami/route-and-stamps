"use client";

import { useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { Copy, QrCode, ShareNetwork, UserPlus, XCircle } from "@phosphor-icons/react";
import { Card, CardKicker, CardTitle, CardMeta } from "@/components/ui/Card";
import { Tag } from "@/components/ui/Tag";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { useTrip } from "@/lib/queries/use-trip";
import { useTripMembers } from "@/lib/queries/use-trip-members";
import {
  useActiveTripInvite,
  useCreateTripInvite,
  useRevokeTripInvite,
} from "@/lib/queries/use-trip-invites";

interface MembersViewProps {
  tripId: string;
}

function InviteSection({ tripId }: { tripId: string }) {
  const { data: trip } = useTrip(tripId);
  const { data: invite, isLoading } = useActiveTripInvite(tripId);
  const createInvite = useCreateTripInvite(tripId);
  const revokeInvite = useRevokeTripInvite(tripId);
  const [showQr, setShowQr] = useState(false);
  const [confirmRevoke, setConfirmRevoke] = useState(false);
  const [copied, setCopied] = useState(false);

  if (isLoading) return null;

  if (!invite) {
    return (
      <Button
        type="button"
        variant="primary"
        onClick={() => createInvite.mutate()}
        disabled={createInvite.isPending}
      >
        <UserPlus weight="duotone" size={20} />
        {createInvite.isPending ? "Creating…" : "Create invite link"}
      </Button>
    );
  }

  // Path only — the full URL needs window.location.origin, which doesn't
  // exist during this page's per-request SSR pass. Handlers below only ever
  // run from a click, so they can read window directly with no SSR risk;
  // the QR dialog is the same story (only ever mounted after showQr is set
  // from a click).
  const invitePath = `/invite/${invite.token}`;

  async function handleCopy() {
    await navigator.clipboard.writeText(`${window.location.origin}${invitePath}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function handleShare() {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Join ${trip?.name ?? "our trip"} on Route & Stamps`,
          url: `${window.location.origin}${invitePath}`,
        });
      } catch {
        // User dismissed the share sheet — not an error.
      }
    } else {
      handleCopy();
    }
  }

  return (
    <Card>
      <CardKicker>Invite link</CardKicker>
      <CardTitle>{invitePath}</CardTitle>
      <CardMeta>Anyone with this link can join until it expires or is revoked.</CardMeta>

      <div className="flex flex-wrap gap-2 pt-2">
        <Button type="button" variant="secondary" onClick={handleCopy}>
          <Copy weight="duotone" size={18} />
          {copied ? "Copied!" : "Copy link"}
        </Button>
        <Button type="button" variant="secondary" onClick={() => setShowQr(true)}>
          <QrCode weight="duotone" size={18} />
          QR code
        </Button>
        <Button type="button" variant="secondary" onClick={handleShare}>
          <ShareNetwork weight="duotone" size={18} />
          Share
        </Button>
        <Button type="button" variant="ghost" onClick={() => setConfirmRevoke(true)}>
          <XCircle weight="duotone" size={18} />
          Revoke
        </Button>
      </div>

      {showQr && (
        <Dialog open onClose={() => setShowQr(false)} title="Scan to join">
          <div className="flex justify-center p-4">
            <QRCodeSVG
              value={`${window.location.origin}${invitePath}`}
              size={220}
              marginSize={2}
            />
          </div>
        </Dialog>
      )}

      <Dialog
        open={confirmRevoke}
        onClose={() => setConfirmRevoke(false)}
        title="Revoke this invite?"
        actions={
          <>
            <Button type="button" variant="secondary" onClick={() => setConfirmRevoke(false)}>
              Cancel
            </Button>
            <Button
              type="button"
              variant="primary"
              style={{ background: "var(--color-accent-2)" }}
              disabled={revokeInvite.isPending}
              onClick={() =>
                revokeInvite.mutate(invite.token, {
                  onSuccess: () => setConfirmRevoke(false),
                })
              }
            >
              {revokeInvite.isPending ? "Revoking…" : "Revoke"}
            </Button>
          </>
        }
      >
        <p>Anyone who hasn&rsquo;t already joined won&rsquo;t be able to use this link anymore.</p>
      </Dialog>
    </Card>
  );
}

type Tab = "members" | "invite";

export function MembersView({ tripId }: MembersViewProps) {
  const { data: members = [], isLoading } = useTripMembers(tripId);
  const [tab, setTab] = useState<Tab>("members");

  return (
    <div className="flex flex-col gap-4 p-6">
      <h1>Trip Members</h1>

      <div className="seg" role="radiogroup" aria-label="View">
        {(["members", "invite"] as const).map((value) => (
          <label key={value} className="seg-opt">
            <input
              type="radio"
              name="members-tab"
              value={value}
              checked={tab === value}
              onChange={() => setTab(value)}
            />
            {value === "members" ? "Members" : "Invite"}
          </label>
        ))}
      </div>

      {tab === "invite" ? (
        <InviteSection tripId={tripId} />
      ) : (
        <div className="flex flex-col gap-3">
          {isLoading && <p className="text-muted">Loading…</p>}
          {members.map((member) => (
            <Card key={member.user_id}>
              <div className="flex items-center justify-between gap-2">
                <CardTitle>{member.displayName}</CardTitle>
                <Tag variant={member.role === "owner" ? "accent" : "neutral"}>
                  {member.role}
                </Tag>
              </div>
              <CardMeta>
                Joined {new Date(member.joined_at).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}
              </CardMeta>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
