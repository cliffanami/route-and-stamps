import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

// Nominatim's usage policy requires an identifying User-Agent — no API key,
// so this is the only credential-equivalent it asks for.
const NOMINATIM_USER_AGENT = "RouteAndStamps/1.0 (https://route-and-stamps.vercel.app)";

const querySchema = z.object({
  q: z.string().trim().min(1, "q is required"),
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
  const parsed = querySchema.safeParse({ q: searchParams.get("q") });

  if (!parsed.success) {
    return NextResponse.json(
      { error: { code: "validation_error", message: parsed.error.issues[0].message } },
      { status: 400 },
    );
  }

  const nominatimUrl = new URL("https://nominatim.openstreetmap.org/search");
  nominatimUrl.searchParams.set("q", parsed.data.q);
  nominatimUrl.searchParams.set("format", "jsonv2");
  nominatimUrl.searchParams.set("addressdetails", "1");
  nominatimUrl.searchParams.set("limit", "5");
  // Without this, Nominatim returns address components in the place's local
  // script (e.g. "千代田区" for a Tokyo ward) since the server-to-server
  // fetch carries no browser Accept-Language to fall back on.
  nominatimUrl.searchParams.set("accept-language", "en");

  let response: Response;
  try {
    response = await fetch(nominatimUrl, {
      headers: { "User-Agent": NOMINATIM_USER_AGENT },
    });
  } catch {
    return NextResponse.json(
      { error: { code: "upstream_unavailable", message: "Geocoding service unavailable." } },
      { status: 502 },
    );
  }

  if (!response.ok) {
    return NextResponse.json(
      { error: { code: "upstream_unavailable", message: "Geocoding service unavailable." } },
      { status: 502 },
    );
  }

  const results = (await response.json()) as Array<{
    display_name: string;
    lat: string;
    lon: string;
    address?: { city?: string; town?: string; village?: string; suburb?: string };
  }>;

  return NextResponse.json({
    results: results.map((r) => ({
      label: r.display_name,
      lat: Number(r.lat),
      lng: Number(r.lon),
      town: r.address?.city ?? r.address?.town ?? r.address?.village ?? r.address?.suburb ?? null,
    })),
  });
}
