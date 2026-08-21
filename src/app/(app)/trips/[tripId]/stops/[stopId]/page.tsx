import { StopDetail } from "@/components/route/StopDetail";

export default async function StopDetailPage({
  params,
}: {
  params: Promise<{ tripId: string; stopId: string }>;
}) {
  const { tripId, stopId } = await params;

  return <StopDetail tripId={tripId} stopId={stopId} />;
}
