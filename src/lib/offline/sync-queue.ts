import { get, set } from "idb-keyval";

// Offline write queue (ROADMAP.md M6) — scoped exactly to what the bullet
// names: adds/votes/costs. Tips/packing/logistics edits stay online-only.
export type QueuedMutationType = "add_place" | "cast_vote" | "add_budget_line";

export interface QueuedMutation {
  id: string;
  type: QueuedMutationType;
  tripId: string;
  payload: unknown;
  queuedAt: string;
}

const QUEUE_KEY = "sync-queue";

export async function getQueue(): Promise<QueuedMutation[]> {
  return (await get<QueuedMutation[]>(QUEUE_KEY)) ?? [];
}

async function setQueue(queue: QueuedMutation[]): Promise<void> {
  await set(QUEUE_KEY, queue);
}

export async function enqueue(
  entry: Omit<QueuedMutation, "id" | "queuedAt">,
): Promise<void> {
  const queue = await getQueue();
  queue.push({
    ...entry,
    id: crypto.randomUUID(),
    queuedAt: new Date().toISOString(),
  });
  await setQueue(queue);
}

// Distinguishes "the network is the problem, queue it" from a real error
// (bad input, RLS rejection) that should surface normally rather than be
// silently retried forever. A raw `fetch` rejection is a TypeError, but
// supabase-js's PostgrestBuilder catches that and re-wraps it into a plain
// { message, details, hint, code } object (confirmed by instrumenting a
// real offline mutation) — the original TypeError only survives as text
// inside `message` ("TypeError: Failed to fetch"), so `error instanceof
// TypeError` alone never matches a real Supabase call failure.
export function isNetworkError(error: unknown): boolean {
  if (typeof navigator !== "undefined" && !navigator.onLine) return true;
  if (error instanceof TypeError) return true;
  if (
    error &&
    typeof error === "object" &&
    "message" in error &&
    typeof error.message === "string"
  ) {
    return /fetch|network/i.test(error.message);
  }
  return false;
}

type Handler = (tripId: string, payload: unknown) => Promise<void>;
type Handlers = Record<QueuedMutationType, Handler>;

// Drains strictly in order — a failure stops the drain so a later entry
// never jumps ahead of an earlier one that still needs to be retried.
// Returns the distinct (type, tripId) pairs that synced, so the caller
// knows which query keys to invalidate.
export async function drainQueue(
  handlers: Handlers,
): Promise<{ type: QueuedMutationType; tripId: string }[]> {
  const remaining = await getQueue();
  const synced: { type: QueuedMutationType; tripId: string }[] = [];

  while (remaining.length > 0) {
    const entry = remaining[0];
    try {
      await handlers[entry.type](entry.tripId, entry.payload);
      remaining.shift();
      await setQueue(remaining);
      synced.push({ type: entry.type, tripId: entry.tripId });
    } catch {
      break;
    }
  }

  return synced;
}
