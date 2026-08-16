import { BottomNav } from "@/components/ui/BottomNav";
import { NotificationBell } from "@/components/notifications/NotificationBell";

export default async function TripLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ tripId: string }>;
}) {
  const { tripId } = await params;

  return (
    <div className="flex min-h-full flex-1 flex-col pb-16">
      <div className="flex justify-end px-4 pt-2">
        <NotificationBell tripId={tripId} />
      </div>
      <main className="flex-1">{children}</main>
      <BottomNav tripId={tripId} />
    </div>
  );
}
