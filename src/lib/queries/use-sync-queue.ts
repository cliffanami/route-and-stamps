import { useQuery } from "@tanstack/react-query";
import { getQueue } from "@/lib/offline/sync-queue";

// Backed by IndexedDB, not Supabase — only changes via explicit
// invalidation from wherever the queue itself is mutated (enqueue/drain),
// hence staleTime: Infinity rather than any refetch-on-its-own behavior.
export function usePendingSyncCount() {
  return useQuery({
    queryKey: ["sync-queue-count"],
    queryFn: async () => (await getQueue()).length,
    staleTime: Infinity,
  });
}
