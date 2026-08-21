import { get, set } from "idb-keyval";

// Last-synced snapshot of places/stops/tips only — the exact scope
// ROADMAP.md M6 names, not every entity in the app. Read on a failed
// fetch (offline), written whenever a fetch succeeds, so the Route/Map/
// Tips views still render something in airplane mode instead of an error.
type SnapshotEntity = "places" | "stops" | "tips" | "fun_facts";

function snapshotKey(entity: SnapshotEntity, tripId: string) {
  return `snapshot:${entity}:${tripId}`;
}

export async function getSnapshot<T>(
  entity: SnapshotEntity,
  tripId: string,
): Promise<T[] | undefined> {
  return get<T[]>(snapshotKey(entity, tripId));
}

export async function setSnapshot<T>(
  entity: SnapshotEntity,
  tripId: string,
  data: T[],
): Promise<void> {
  await set(snapshotKey(entity, tripId), data);
}

// Wraps a query's normal fetch: on success, refreshes the snapshot for next
// time; on failure (offline), falls back to the last-synced snapshot rather
// than surfacing an error — only re-throws if there's nothing cached yet
// either (first-ever load with no connection).
export async function withSnapshotFallback<T>(
  entity: SnapshotEntity,
  tripId: string,
  fetcher: () => Promise<T[]>,
): Promise<T[]> {
  try {
    const data = await fetcher();
    await setSnapshot(entity, tripId, data);
    return data;
  } catch (error) {
    const cached = await getSnapshot<T>(entity, tripId);
    if (cached) return cached;
    throw error;
  }
}
