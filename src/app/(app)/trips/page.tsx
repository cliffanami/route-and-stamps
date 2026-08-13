import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function TripsPage() {
  const supabase = await createClient();
  const { data: trips } = await supabase.from("trips").select("id").limit(1);

  if (trips && trips.length > 0) {
    redirect(`/trips/${trips[0].id}/route`);
  }

  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-2 p-8">
      <h1>No trip yet</h1>
      <p>Seed the Japan 2026 trip to get started (ROADMAP.md M0).</p>
    </main>
  );
}
