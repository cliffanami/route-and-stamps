import Link from "next/link";
import { Gear, Users } from "@phosphor-icons/react/dist/ssr";
import { BottomNav } from "@/components/ui/BottomNav";
import { NotificationBell } from "@/components/notifications/NotificationBell";
import { ChatButton } from "@/components/chat/ChatButton";

export default async function TripLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ tripId: string }>;
}) {
  const { tripId } = await params;
  // Checked server-side, same as ENABLE_AI_PLACE_EXTRACTION — flips
  // without a redeploy, and killing it hides the icon entirely rather
  // than showing a broken/disabled affordance (ROADMAP.md Milestone G).
  const chatEnabled = process.env.ENABLE_AI_CHAT === "true";

  return (
    <div className="flex min-h-full flex-1 flex-col pb-20">
      <div className="flex justify-end gap-1 px-4 pt-2">
        <Link
          href={`/trips/${tripId}/members`}
          aria-label="Trip members"
          className="inline-flex items-center justify-center p-2"
        >
          <Users weight="duotone" size={24} />
        </Link>
        <NotificationBell tripId={tripId} />
        {chatEnabled && <ChatButton tripId={tripId} />}
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
