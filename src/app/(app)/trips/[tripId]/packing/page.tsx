import { PackingView } from "@/components/packing/PackingView";

export default async function PackingPage({
  params,
}: {
  params: Promise<{ tripId: string }>;
}) {
  const { tripId } = await params;

  return <PackingView tripId={tripId} />;
}
