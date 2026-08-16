import { MembersView } from "@/components/members/MembersView";

export default async function MembersPage({
  params,
}: {
  params: Promise<{ tripId: string }>;
}) {
  const { tripId } = await params;

  return <MembersView tripId={tripId} />;
}
