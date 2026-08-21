import { ShareChooser } from "@/components/share/ShareChooser";

export default async function ShareChoosePage({
  params,
  searchParams,
}: {
  params: Promise<{ tripId: string }>;
  searchParams: Promise<{ shared_url?: string }>;
}) {
  const { tripId } = await params;
  const { shared_url: sharedUrl } = await searchParams;

  return <ShareChooser tripId={tripId} sharedUrl={sharedUrl} />;
}
