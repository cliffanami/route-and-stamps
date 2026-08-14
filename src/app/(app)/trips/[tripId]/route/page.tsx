import { RouteSpine } from "@/components/route/RouteSpine";

export default async function RoutePage({
  params,
}: {
  params: Promise<{ tripId: string }>;
}) {
  const { tripId } = await params;

  return <RouteSpine tripId={tripId} />;
}
