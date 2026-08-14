import { PlaceForm } from "@/components/places/PlaceForm";

export default async function AddPlacePage({
  params,
}: {
  params: Promise<{ tripId: string }>;
}) {
  const { tripId } = await params;

  return (
    <div>
      <h1 className="px-6 pt-6">Add a Place</h1>
      <PlaceForm tripId={tripId} />
    </div>
  );
}
