import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const NOMINATIM_USER_AGENT = "RouteAndStamps/1.0 (https://route-and-stamps.vercel.app)";

const querySchema = z.object({
  lat: z.coerce.number().min(-90).max(90),
  lng: z.coerce.number().min(-180).max(180),
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
  const parsed = querySchema.safeParse({
    lat: searchParams.get("lat"),
    lng: searchParams.get("lng"),
  });

  if (!parsed.success) {
    return NextResponse.json(
      { error: { code: "validation_error", message: parsed.error.issues[0].message } },
      { status: 400 },
    );
  }

  const nominatimUrl = new URL("https://nominatim.openstreetmap.org/reverse");
  nominatimUrl.searchParams.set("lat", String(parsed.data.lat));
  nominatimUrl.searchParams.set("lon", String(parsed.data.lng));
  nominatimUrl.searchParams.set("format", "jsonv2");
  nominatimUrl.searchParams.set("addressdetails", "1");

  let response: Response;
  try {
    response = await fetch(nominatimUrl, {
      headers: { "User-Agent": NOMINATIM_USER_AGENT },
    });
  } catch {
    return NextResponse.json(
      { error: { code: "upstream_unavailable", message: "Reverse geocoding service unavailable." } },
      { status: 502 },
    );
  }

  if (!response.ok) {
    return NextResponse.json(
      { error: { code: "upstream_unavailable", message: "Reverse geocoding service unavailable." } },
      { status: 502 },
    );
  }

  const result = (await response.json()) as {
    address?: { city?: string; town?: string; village?: string; suburb?: string };
  };

  return NextResponse.json({
    town:
      result.address?.city ??
      result.address?.town ??
      result.address?.village ??
      result.address?.suburb ??
      null,
  });
}
