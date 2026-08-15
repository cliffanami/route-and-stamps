import { TipsView } from "@/components/tips/TipsView";

export default async function TipsPage({
  params,
}: {
  params: Promise<{ tripId: string }>;
}) {
  const { tripId } = await params;

  return <TipsView tripId={tripId} />;
}
