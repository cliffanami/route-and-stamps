import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Web Share Target's receiving endpoint (manifest.ts's share_target.action,
// ROADMAP.md Milestone B) — Android hands off a shared URL/text here, GET
// with query params (manifest declares method: "GET"). There's no
// multi-trip picker in this app; resolves the same first-trip-found way
// /trips/page.tsx already does, since the manifest can't know a trip id
// statically. Not reachable through (app)'s layout (this route lives
// outside that route group), so auth is handled explicitly here, same
// next-param round-trip pattern the invite flow already uses.
//
// Lands on the share-choose chooser (Milestone H), not directly on
// Add-a-Place — always asks Place vs. Tip rather than assuming, per
// explicit call.
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const sharedUrl = searchParams.get("shared_url") ?? searchParams.get("shared_text") ?? "";

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    const next = `/share-target?${searchParams.toString()}`;
    return NextResponse.redirect(
      `${origin}/login?next=${encodeURIComponent(next)}`,
    );
  }

  const { data: trips } = await supabase.from("trips").select("id").limit(1);

  if (!trips || trips.length === 0) {
    return NextResponse.redirect(`${origin}/trips`);
  }

  const chooseUrl = new URL(`/trips/${trips[0].id}/share-choose`, origin);
  if (sharedUrl) chooseUrl.searchParams.set("shared_url", sharedUrl);
  return NextResponse.redirect(chooseUrl);
}
