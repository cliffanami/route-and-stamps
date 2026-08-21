"use client";

import { Bell, BellSlash } from "@phosphor-icons/react";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import {
  usePushSubscriptionStatus,
  useEnablePush,
  useDisablePush,
} from "@/lib/queries/use-push-subscription";
import { useUpdatePushEnabledTypes } from "@/lib/queries/use-profile";
import type { NotificationType, Profile } from "@/types/database.types";

// vote_cast is excluded — it's a dead enum value nothing fires
// (NotificationsView.tsx's own comment: "Not fired by anything yet").
const TYPE_LABELS: Partial<Record<NotificationType, string>> = {
  consensus_reached: "Mutual Must Go reached",
  place_added: "New place added",
  tip_added: "New tip added",
  arrival_estimated: "Arrival estimate",
  packing_due: "Packing reminder due",
  trip_joined: "Someone joined the trip",
};

interface PushNotificationSettingsProps {
  profile: Profile;
}

// ROADMAP.md "Push notifications" — real OS-tray alerts while the app
// isn't open. This is per-device (the toggle reflects whether *this*
// browser has an active subscription, not an account-wide flag — a
// person can enable it on their phone and not their laptop) and
// per-type (push_enabled_types on profiles, editable regardless of
// whether this specific device is currently subscribed, so switching
// devices later picks up the same preference).
export function PushNotificationSettings({ profile }: PushNotificationSettingsProps) {
  const { data: status, isLoading } = usePushSubscriptionStatus();
  const enablePush = useEnablePush();
  const disablePush = useDisablePush();
  const updateTypes = useUpdatePushEnabledTypes();
  const { showToast } = useToast();

  if (isLoading || !status) {
    return null;
  }

  if (!status.supported) {
    return (
      <div className="flex flex-col gap-2">
        <h2>Notifications</h2>
        <p className="text-muted">
          Push notifications aren&rsquo;t supported in this browser.
          {" "}
          On iPhone, add Route &amp; Stamps to your home screen first — iOS
          only supports push for an installed app, not a regular Safari tab.
        </p>
      </div>
    );
  }

  async function handleToggle() {
    try {
      if (status!.subscribed) {
        await disablePush.mutateAsync();
        showToast("Notifications turned off on this device");
      } else {
        await enablePush.mutateAsync();
        showToast("Notifications enabled on this device");
      }
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Couldn't update that — try again.");
    }
  }

  function toggleType(type: NotificationType) {
    const current = profile.push_enabled_types;
    const next = current.includes(type)
      ? current.filter((t) => t !== type)
      : [...current, type];
    updateTypes.mutate(next);
  }

  return (
    <div className="flex flex-col gap-3">
      <h2>Notifications</h2>

      <Button
        type="button"
        variant="secondary"
        onClick={handleToggle}
        disabled={enablePush.isPending || disablePush.isPending}
      >
        {status.subscribed ? (
          <>
            <BellSlash weight="duotone" size={20} />
            Turn off notifications on this device
          </>
        ) : (
          <>
            <Bell weight="duotone" size={20} />
            Enable notifications on this device
          </>
        )}
      </Button>

      {status.subscribed && (
        <div className="flex flex-col gap-2">
          <p className="text-muted">Send a push for:</p>
          {(Object.keys(TYPE_LABELS) as NotificationType[]).map((type) => (
            <label key={type} className="field flex flex-row items-center gap-2">
              <input
                type="checkbox"
                checked={profile.push_enabled_types.includes(type)}
                onChange={() => toggleType(type)}
              />
              {TYPE_LABELS[type]}
            </label>
          ))}
        </div>
      )}
    </div>
  );
}
