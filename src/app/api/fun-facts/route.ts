import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

// Wikipedia's REST summary endpoint is keyless — no credential-equivalent
// needed the way Nominatim's User-Agent policy requires (ROADMAP.md
// Milestone F). Called server-side only to avoid a client-side CORS trip
// and to keep the fetch pattern consistent with the other proxies.
const querySchema = z.object({
  title: z.string().trim().min(1, "title is required"),
});

export async function GET(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json(
      { error: { code: "unauthenticated", message: "Sign in required." } },
      { status: 401 },
    );
  }

  const { searchParams } = new URL(request.url);
  const parsed = querySchema.safeParse({ title: searchParams.get("title") });

  if (!parsed.success) {
    return NextResponse.json(
      { error: { code: "validation_error", message: parsed.error.issues[0].message } },
      { status: 400 },
    );
  }

  const wikiUrl = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(parsed.data.title)}`;

  let response: Response;
  try {
    response = await fetch(wikiUrl, {
      headers: { Accept: "application/json" },
    });
  } catch {
    return NextResponse.json(
      { error: { code: "upstream_unavailable", message: "Wikipedia is unavailable." } },
      { status: 502 },
    );
  }

  // A 404 here means "no matching article" — a real, expected outcome for
  // a stop name Wikipedia doesn't have (or can't disambiguate), not a
  // failure worth a 502.
  if (response.status === 404) {
    return NextResponse.json({ extract: null, title: null });
  }

  if (!response.ok) {
    return NextResponse.json(
      { error: { code: "upstream_unavailable", message: "Wikipedia is unavailable." } },
      { status: 502 },
    );
  }

  const body = (await response.json()) as { title?: string; extract?: string };

  return NextResponse.json({
    title: body.title ?? null,
    extract: body.extract?.trim() || null,
  });
}
