"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Bell,
  HandHeart,
  MapPinPlus,
  Lightbulb,
  Clock,
  SuitcaseRolling,
  UserPlus,
} from "@phosphor-icons/react";
import { Button } from "@/components/ui/Button";
import { Card, CardMeta } from "@/components/ui/Card";
import { createClient } from "@/lib/supabase/client";
import {
  useNotifications,
  useMarkNotificationRead,
  useMarkAllNotificationsRead,
} from "@/lib/queries/use-notifications";
import type { Notification, NotificationType } from "@/types/database.types";

interface NotificationsViewProps {
  tripId: string;
}

const NOTIFICATION_META: Record<
  NotificationType,
  {
    icon: typeof Bell;
    message: (payload: Record<string, string>) => string;
    href: (tripId: string, payload: Record<string, string>) => string;
  }
> = {
  consensus_reached: {
    icon: HandHeart,
    message: (p) => `Mutual Must Go: ${p.place_name}`,
    href: (tripId, p) => `/trips/${tripId}/places/${p.place_id}`,
  },
  place_added: {
    icon: MapPinPlus,
    message: (p) => `${p.added_by_name} added ${p.place_name}`,
    href: (tripId, p) => `/trips/${tripId}/places/${p.place_id}`,
  },
  tip_added: {
    icon: Lightbulb,
    message: (p) => `${p.added_by_name} added a tip in ${p.category}`,
    href: (tripId) => `/trips/${tripId}/tips`,
  },
  // Not fired by anything yet (ROADMAP.md M7 scopes the instant path to
  // consensus only) — handled so the feed never breaks on an unexpected row.
  vote_cast: {
    icon: Bell,
    message: () => "New vote activity",
    href: (tripId) => `/trips/${tripId}/route`,
  },
  arrival_estimated: {
    icon: Clock,
    message: (p) => `Probably arriving in ${p.stop_name} around now`,
    href: (tripId) => `/trips/${tripId}/route`,
  },
  packing_due: {
    icon: SuitcaseRolling,
    message: (p) => `Packing reminder: ${p.item_name}`,
    href: (tripId) => `/trips/${tripId}/packing`,
  },
  trip_joined: {
    icon: UserPlus,
    message: (p) =>
      p.joiner_name
        ? `${p.joiner_name} joined the trip`
        : `You joined ${p.trip_name}`,
    href: (tripId) => `/trips/${tripId}/members`,
  },
};

function timeAgo(isoDate: string): string {
  const seconds = Math.floor((Date.now() - new Date(isoDate).getTime()) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function NotificationRow({
  tripId,
  notification,
  onRead,
}: {
  tripId: string;
  notification: Notification;
  onRead: (id: string) => void;
}) {
  const meta = NOTIFICATION_META[notification.type];
  const Icon = meta.icon;
  const isUnread = notification.read_at === null;

  return (
    <Link
      href={meta.href(tripId, notification.payload)}
      onClick={() => isUnread && onRead(notification.id)}
    >
      <Card
        style={
          isUnread
            ? { borderLeft: "3px solid var(--color-accent)" }
            : { opacity: 0.7 }
        }
      >
        <div className="flex items-start gap-3">
          <Icon weight="duotone" size={22} />
          <div className="flex flex-1 flex-col gap-1">
            <p>{meta.message(notification.payload)}</p>
            <CardMeta>{timeAgo(notification.created_at)}</CardMeta>
          </div>
        </div>
      </Card>
    </Link>
  );
}

export function NotificationsView({ tripId }: NotificationsViewProps) {
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth
      .getUser()
      .then(({ data }) => setUserId(data.user?.id ?? null));
  }, []);

  const { data: notifications = [], isLoading, error } = useNotifications(
    tripId,
    userId,
  );
  const markRead = useMarkNotificationRead(tripId, userId);
  const markAllRead = useMarkAllNotificationsRead(tripId, userId);
  const unreadCount = notifications.filter((n) => n.read_at === null).length;

  if (error) {
    return (
      <p className="px-6 py-4 text-muted">
        Couldn&rsquo;t load notifications:{" "}
        {error instanceof Error ? error.message : String(error)}
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-4 p-6">
      <div className="flex items-center justify-between gap-2">
        <h1>Notifications</h1>
        {unreadCount > 0 && (
          <Button
            type="button"
            variant="secondary"
            onClick={() => markAllRead.mutate()}
            disabled={markAllRead.isPending}
          >
            Mark all read
          </Button>
        )}
      </div>

      {isLoading && <p className="text-muted">Loading…</p>}
      {!isLoading && notifications.length === 0 && (
        <p className="text-muted">No notifications yet.</p>
      )}

      <div className="flex flex-col gap-3">
        {notifications.map((notification) => (
          <NotificationRow
            key={notification.id}
            tripId={tripId}
            notification={notification}
            onRead={(id) => markRead.mutate(id)}
          />
        ))}
      </div>
    </div>
  );
}
