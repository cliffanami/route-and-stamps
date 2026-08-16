import { Card, CardKicker, CardTitle, CardMeta } from "@/components/ui/Card";
import { JoinTripButton } from "@/components/invite/JoinTripButton";
import { createClient } from "@/lib/supabase/server";
import type { InvitePreview } from "@/types/database.types";

function formatDateRange(start: string | null, end: string | null): string | null {
  if (!start && !end) return null;
  const fmt = (d: string) =>
    new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  if (start && end) return `${fmt(start)} – ${fmt(end)}`;
  return fmt(start ?? end!);
}

export default async function InvitePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const supabase = await createClient();

  const [{ data: preview }, { data: { user } }] = await Promise.all([
    supabase.rpc("resolve_invite_preview", { p_token: token }).single<InvitePreview>(),
    supabase.auth.getUser(),
  ]);

  if (!preview) {
    return (
      <main className="flex flex-1 flex-col items-center justify-center gap-4 p-8">
        <h1>Invite not found</h1>
        <p className="text-muted">This invite link doesn&rsquo;t exist.</p>
      </main>
    );
  }

  const dateRange = formatDateRange(preview.start_date, preview.end_date);

  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-6 p-8">
      <div className="flex w-full max-w-md flex-col gap-4">
        <div className="flex flex-col items-center gap-1 text-center">
          <p className="text-muted">{preview.inviter_name} invited you to</p>
          <h1>{preview.trip_name}</h1>
        </div>

        <Card>
          <CardKicker>Trip</CardKicker>
          <CardTitle>{preview.trip_name}</CardTitle>
          {dateRange && <CardMeta>{dateRange}</CardMeta>}
          {preview.stop_cities.length > 0 && (
            <CardMeta>{preview.stop_cities.join(" → ")}</CardMeta>
          )}
          <CardMeta>
            {preview.place_count} {preview.place_count === 1 ? "place" : "places"} ·{" "}
            {preview.tip_count} {preview.tip_count === 1 ? "tip" : "tips"}
          </CardMeta>
        </Card>

        {preview.is_valid ? (
          <JoinTripButton
            token={token}
            tripId={preview.trip_id}
            isAuthenticated={user !== null}
          />
        ) : (
          <p className="text-center text-muted">
            This invite has expired or been revoked.
          </p>
        )}
      </div>
    </main>
  );
}
