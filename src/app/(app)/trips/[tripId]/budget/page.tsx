import { BudgetView } from "@/components/budget/BudgetView";

export default async function BudgetPage({
  params,
}: {
  params: Promise<{ tripId: string }>;
}) {
  const { tripId } = await params;

  return <BudgetView tripId={tripId} />;
}
