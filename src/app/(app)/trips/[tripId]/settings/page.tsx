import { TripSettingsView } from "@/components/trip/TripSettingsView";

export default async function SettingsPage({
  params,
}: {
  params: Promise<{ tripId: string }>;
}) {
  const { tripId } = await params;

  return <TripSettingsView tripId={tripId} />;
}
