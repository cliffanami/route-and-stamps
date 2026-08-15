import { PlaceDetail } from "@/components/places/PlaceDetail";

export default async function PlaceDetailPage({
  params,
}: {
  params: Promise<{ tripId: string; placeId: string }>;
}) {
  const { tripId, placeId } = await params;

  return <PlaceDetail tripId={tripId} placeId={placeId} />;
}
