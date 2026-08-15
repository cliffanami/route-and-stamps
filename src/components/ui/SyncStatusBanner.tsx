"use client";

import { usePendingSyncCount } from "@/lib/queries/use-sync-queue";

// Persistent, not a toast — a queued change should stay visible until it
// actually syncs, not auto-dismiss after a few seconds (ROADMAP.md M6's
// "visible pending-sync indicator").
export function SyncStatusBanner() {
  const { data: count = 0 } = usePendingSyncCount();

  if (count === 0) return null;

  return (
    <div
      className="px-4 py-2 text-center text-sm"
      style={{
        background: "var(--color-accent-100)",
        color: "var(--color-accent-800)",
      }}
      role="status"
    >
      {count} change{count === 1 ? "" : "s"} waiting to sync
    </div>
  );
}
