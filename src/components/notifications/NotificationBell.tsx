"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Bell, BellRinging } from "@phosphor-icons/react";
import { createClient } from "@/lib/supabase/client";
import { useNotifications } from "@/lib/queries/use-notifications";

interface NotificationBellProps {
  tripId: string;
}

// The badge is the one deliberate, isolated use of the magenta second
// accent here (CONVENTIONS.md §5b) — the bell icon itself renders in
// plain ink (currentColor, no explicit accent), so there's no cyan
// alongside it in this small component.
export function NotificationBell({ tripId }: NotificationBellProps) {
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth
      .getUser()
      .then(({ data }) => setUserId(data.user?.id ?? null));
  }, []);

  const { data: notifications = [] } = useNotifications(tripId, userId);
  const unreadCount = notifications.filter((n) => n.read_at === null).length;

  return (
    <Link
      href={`/trips/${tripId}/notifications`}
      aria-label={
        unreadCount > 0
          ? `${unreadCount} unread notification${unreadCount === 1 ? "" : "s"}`
          : "Notifications"
      }
      className="relative inline-flex items-center justify-center p-2"
    >
      {unreadCount > 0 ? (
        <BellRinging weight="duotone" size={24} />
      ) : (
        <Bell weight="duotone" size={24} />
      )}
      {unreadCount > 0 && (
        <span
          aria-hidden="true"
          className="absolute flex items-center justify-center"
          style={{
            top: 2,
            right: 2,
            minWidth: 16,
            height: 16,
            borderRadius: "999px",
            background: "var(--color-accent-2)",
            color: "var(--color-bg)",
            fontSize: 10,
            padding: "0 4px",
          }}
        >
          {unreadCount > 9 ? "9+" : unreadCount}
        </span>
      )}
    </Link>
  );
}
