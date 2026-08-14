import { test, expect, type Page } from "@playwright/test";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Disposable test accounts and an isolated throwaway trip, authenticated by
// calling Supabase directly in the page context (same technique used to
// diagnose the RLS-recursion, empty-stops, and realtime-auth-race bugs
// during M1) — Google's OAuth consent screen isn't something Playwright
// can complete. Requires "Confirm email" off in Supabase Auth settings,
// which it already is for this project.
//
// A dedicated trip per run, not the real "Japan 2026" trip: the consensus
// check requires *every* trip_members row to have voted, and there's no
// DELETE policy on trip_members (the invite flow that would validate
// removal doesn't exist yet) — so running against the real trip would
// permanently accumulate test members on it and eventually make "mutual
// Must go" impossible to satisfy. An isolated trip has exactly the two
// accounts this test creates, so consensus behaves correctly, and any
// leaked trip/trip_members rows are harmless throwaway data instead of
// clutter on the trip you actually use.
async function signUpAndSetUp(
  page: Page,
  label: string,
  tripId: string | null,
): Promise<{ userId: string; tripId?: string }> {
  const email = `e2e-${label}-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`;
  const password = "E2ETestPassword123!";

  const result = await page.evaluate(
    async ({ url, key, email, password, tripId }) => {
      // @ts-expect-error -- URL import resolved by the browser at runtime, not by tsc
      const { createBrowserClient } = await import("https://esm.sh/@supabase/ssr@0.5.2");
      const supabase = createBrowserClient(url, key);

      const signUp = await supabase.auth.signUp({ email, password });
      if (signUp.error || !signUp.data.session) {
        return { error: signUp.error?.message ?? "no session after signUp" };
      }
      const userId = signUp.data.user.id;

      if (tripId) {
        // "b": join the trip "a" already created.
        const { error } = await supabase
          .from("trip_members")
          .insert({ trip_id: tripId, user_id: userId, role: "member" });
        if (error) return { error: error.message };
        return { userId };
      }

      // "a": create the trip, join it, seed one stop. The trips insert
      // deliberately doesn't chain .select() — INSERT ... RETURNING needs
      // the new row to pass the table's SELECT policy too
      // (trips_select_member, via is_trip_member()), which it can't yet
      // since the trip_members row that would grant that doesn't exist
      // until the next statement. Generating the id client-side sidesteps
      // needing the row handed back at all.
      const newTripId = crypto.randomUUID();
      const { error: tripError } = await supabase
        .from("trips")
        .insert({ id: newTripId, name: `E2E Test Trip ${Date.now()}`, created_by: userId });
      if (tripError) return { error: tripError.message };

      const { error: memberError } = await supabase
        .from("trip_members")
        .insert({ trip_id: newTripId, user_id: userId, role: "owner" });
      if (memberError) return { error: memberError.message };

      const { error: stopError } = await supabase
        .from("stops")
        .insert({ trip_id: newTripId, name: "Test Stop", lat: 0, lng: 0, order_index: 1 });
      if (stopError) return { error: stopError.message };

      return { userId, tripId: newTripId };
    },
    { url: SUPABASE_URL, key: SUPABASE_ANON_KEY, email, password, tripId },
  );

  if (result.error) {
    throw new Error(`Setup failed for "${label}": ${result.error}`);
  }
  return result as { userId: string; tripId?: string };
}

async function deleteTestPlace(page: Page, tripId: string, name: string) {
  await page.evaluate(
    async ({ url, key, name, tripId }) => {
      // @ts-expect-error -- URL import resolved by the browser at runtime, not by tsc
      const { createBrowserClient } = await import("https://esm.sh/@supabase/ssr@0.5.2");
      const supabase = createBrowserClient(url, key);
      await supabase.from("places").delete().eq("trip_id", tripId).eq("name", name);
    },
    { url: SUPABASE_URL, key: SUPABASE_ANON_KEY, name, tripId },
  );
}

test.describe("add place and vote", () => {
  test("a place added by one member appears for another via realtime, and mutual Must go flags consensus", async ({
    browser,
  }) => {
    test.setTimeout(90_000);

    const contextA = await browser.newContext();
    const contextB = await browser.newContext();
    const pageA = await contextA.newPage();
    const pageB = await contextB.newPage();

    // Same-origin pages are needed before the in-page Supabase client can
    // set its auth cookies.
    await pageA.goto("/login");
    await pageB.goto("/login");

    const { tripId } = await signUpAndSetUp(pageA, "a", null);
    await signUpAndSetUp(pageB, "b", tripId!);

    const placeName = `E2E Test Place ${Date.now()}`;

    // B is already watching the Route view before the place exists, so
    // seeing it appear can only be the realtime subscription — not the
    // page's own initial fetch (PRD §12c: ~2s target, ROADMAP.md M1).
    await pageB.goto(`/trips/${tripId}/route`);
    await expect(pageB.getByText(placeName)).not.toBeVisible();

    // A adds a place through the real quick-add flow: type a name, geocode
    // it for real via Nominatim, then save under a unique assertable name.
    await pageA.goto(`/trips/${tripId}/add`);
    await pageA.getByLabel("Name").fill("Tokyo Tower");
    await pageA.getByRole("button", { name: "Find location" }).click();
    await expect(pageA.getByText(/Located in|No location found/)).toBeVisible({
      timeout: 15_000,
    });
    await pageA.getByLabel("Name").fill(placeName);
    await pageA.getByRole("button", { name: "Save place" }).click();

    const realtimeStart = Date.now();
    await expect(pageB.getByText(placeName)).toBeVisible({ timeout: 10_000 });
    console.log(`Realtime propagation to B took ${Date.now() - realtimeStart}ms`);

    // Both members vote Must go on the same place -> mutual consensus.
    await pageA.goto(`/trips/${tripId}/route`);
    await expect(pageA.getByText(placeName)).toBeVisible({ timeout: 10_000 });

    const cardA = pageA.locator(".card", { hasText: placeName });
    const cardB = pageB.locator(".card", { hasText: placeName });

    // The radio inputs themselves are visually hidden by design
    // (Broadsheet's .seg-opt CSS: opacity:0, pointer-events:none — the
    // wrapping <label> is the real click target, same as a real user).
    await cardA.getByText("Must go", { exact: true }).click();
    await cardB.getByText("Must go", { exact: true }).click();

    await expect(cardA.getByText("Mutual must go")).toBeVisible({ timeout: 10_000 });
    await expect(cardB.getByText("Mutual must go")).toBeVisible({ timeout: 10_000 });

    await deleteTestPlace(pageA, tripId!, placeName);
    await contextA.close();
    await contextB.close();
  });
});
