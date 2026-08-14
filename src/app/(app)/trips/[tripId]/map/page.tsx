import { MapViewLoader } from "@/components/map/MapViewLoader";

export default async function MapPage({
  params,
}: {
  params: Promise<{ tripId: string }>;
}) {
  const { tripId } = await params;

  return <MapViewLoader tripId={tripId} />;
}
