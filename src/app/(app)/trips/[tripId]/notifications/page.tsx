import { NotificationsView } from "@/components/notifications/NotificationsView";

export default async function NotificationsPage({
  params,
}: {
  params: Promise<{ tripId: string }>;
}) {
  const { tripId } = await params;

  return <NotificationsView tripId={tripId} />;
}
