"use client";

import { useState } from "react";
import { PencilSimple } from "@phosphor-icons/react";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import { useProfile, useUpdateProfile } from "@/lib/queries/use-profile";
import type { Profile } from "@/types/database.types";

// Fills out the previously-orphaned Profile page (ROADMAP.md Milestone A).
// Display name is the one field made editable — avatar/notification style
// stay display-only for now: no upload flow and no notification-preference
// column exist in schema.sql yet, so wiring either up is future scope, not
// this milestone's.
export function ProfileForm() {
  const { data: profile, isLoading } = useProfile();

  if (isLoading || !profile) {
    return <p className="text-muted">Loading…</p>;
  }

  return <ProfileFieldsForm profile={profile} />;
}

// Read-only by default, same edit-mode-toggle convention as
// PlaceDetail/StopDetail — split out so `useState`'s initial value can be
// seeded straight from an already-loaded profile (same pattern as
// EditPlaceDetailsForm taking `place` as a prop) instead of an effect
// syncing state after the async fetch resolves.
function ProfileFieldsForm({ profile }: { profile: Profile }) {
  const [editing, setEditing] = useState(false);

  if (!editing) {
    return (
      <div className="flex flex-col gap-4">
        {profile.avatar_url && (
          // eslint-disable-next-line @next/next/no-img-element -- external Google avatar URL, not a static asset next/image can optimize
          <img
            src={profile.avatar_url}
            alt=""
            width={64}
            height={64}
            className="rounded-full"
          />
        )}
        <div className="flex items-center justify-between gap-2">
          <p>{profile.display_name}</p>
          <Button
            type="button"
            variant="ghost"
            icon
            onClick={() => setEditing(true)}
            aria-label="Edit profile"
          >
            <PencilSimple weight="duotone" size={20} />
          </Button>
        </div>
      </div>
    );
  }

  return <EditProfileForm profile={profile} onDone={() => setEditing(false)} />;
}

function EditProfileForm({
  profile,
  onDone,
}: {
  profile: Profile;
  onDone: () => void;
}) {
  const updateProfile = useUpdateProfile();
  const { showToast } = useToast();

  const [displayName, setDisplayName] = useState(profile.display_name);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);

    if (!displayName.trim()) {
      setError("Name is required");
      return;
    }

    try {
      await updateProfile.mutateAsync({ display_name: displayName });
      showToast("Profile updated");
      onDone();
    } catch {
      setError("Couldn't save changes — try again.");
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      {profile.avatar_url && (
        // eslint-disable-next-line @next/next/no-img-element -- external Google avatar URL, not a static asset next/image can optimize
        <img
          src={profile.avatar_url}
          alt=""
          width={64}
          height={64}
          className="rounded-full"
        />
      )}

      <div className="field">
        <label htmlFor="display-name">Display name</label>
        <input
          id="display-name"
          className="input"
          value={displayName}
          onChange={(event) => setDisplayName(event.target.value)}
        />
      </div>

      {error && <p className="text-muted">{error}</p>}

      <div className="flex gap-2">
        <Button type="submit" variant="primary" disabled={updateProfile.isPending}>
          {updateProfile.isPending ? "Saving…" : "Save changes"}
        </Button>
        <Button type="button" variant="secondary" onClick={onDone}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
