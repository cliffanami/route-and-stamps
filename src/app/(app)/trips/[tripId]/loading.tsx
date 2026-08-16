// Every trip sub-page is a dynamic Server Component (needs a Supabase
// round-trip), and with no loading.tsx anywhere, navigation gave zero
// instant feedback on tap — the screen just sat frozen until the full
// round-trip resolved. This Suspense fallback covers every nested route
// under [tripId] (route/map/add/tips/budget/packing/members/notifications/
// places/[placeId]) with one file, matching the "Loading…" treatment
// already used by each view's own internal loading states.
export default function TripSectionLoading() {
  return <p className="px-6 py-4 text-muted">Loading…</p>;
}
