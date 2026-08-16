import { PlaceForm } from "@/components/places/PlaceForm";

export default async function AddPlacePage({
  params,
  searchParams,
}: {
  params: Promise<{ tripId: string }>;
  searchParams: Promise<{ shared_url?: string }>;
}) {
  const { tripId } = await params;
  const { shared_url: sharedUrl } = await searchParams;

  return (
    <div>
      <h1 className="px-6 pt-6">Add a Place</h1>
      <PlaceForm tripId={tripId} initialSourceUrl={sharedUrl} />
    </div>
  );
}
