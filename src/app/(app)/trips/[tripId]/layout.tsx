import Link from "next/link";
import { Gear, Users } from "@phosphor-icons/react/dist/ssr";
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
      <div className="flex justify-end gap-1 px-4 pt-2">
        <Link
          href={`/trips/${tripId}/members`}
          aria-label="Trip members"
          className="inline-flex items-center justify-center p-2"
        >
          <Users weight="duotone" size={24} />
        </Link>
        <NotificationBell tripId={tripId} />
        <Link
          href={`/trips/${tripId}/settings`}
          aria-label="Trip settings"
          className="inline-flex items-center justify-center p-2"
        >
          <Gear weight="duotone" size={24} />
        </Link>
      </div>
      <main className="flex-1">{children}</main>
      <BottomNav tripId={tripId} />
    </div>
  );
}
