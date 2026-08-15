import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

// oEmbed proxy (ARCHITECTURE.md §2, ROADMAP.md M2) — the browser shouldn't
// call Instagram/TikTok directly (rate limits, and Instagram's endpoint
// needs a server-side access token). TikTok's oEmbed is genuinely keyless;
// Instagram's has required a Meta app access token since 2020, despite
// ARCHITECTURE.md describing both as "keyless" — treated as deferred config
// (see .env.example) and folded into the same graceful-failure path as a
// private/deleted post, per ROADMAP.md M2's stated fallback behavior.

const querySchema = z.object({
  url: z.string().trim().url("url is required"),
});

function unavailable(message: string, status: number) {
  return NextResponse.json(
    { error: { code: "embed_unavailable", message } },
    { status },
  );
}

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
  const parsed = querySchema.safeParse({ url: searchParams.get("url") });
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: {
          code: "validation_error",
          message: parsed.error.issues[0].message,
        },
      },
      { status: 400 },
    );
  }

  let hostname: string;
  try {
    hostname = new URL(parsed.data.url).hostname.replace(/^www\./, "");
  } catch {
    return NextResponse.json(
      {
        error: { code: "validation_error", message: "url is not a valid URL" },
      },
      { status: 400 },
    );
  }

  let oembedUrl: URL;
  let provider: "instagram" | "tiktok";

  if (hostname === "instagram.com") {
    const accessToken = process.env.INSTAGRAM_OEMBED_ACCESS_TOKEN;
    if (!accessToken) {
      return unavailable("Instagram embeds aren't configured yet.", 502);
    }
    provider = "instagram";
    oembedUrl = new URL("https://graph.facebook.com/v20.0/instagram_oembed");
    oembedUrl.searchParams.set("url", parsed.data.url);
    oembedUrl.searchParams.set("access_token", accessToken);
  } else if (hostname === "tiktok.com" || hostname === "vm.tiktok.com") {
    provider = "tiktok";
    oembedUrl = new URL("https://www.tiktok.com/oembed");
    oembedUrl.searchParams.set("url", parsed.data.url);
  } else {
    return NextResponse.json(
      {
        error: {
          code: "validation_error",
          message: "Only Instagram and TikTok links can be embedded.",
        },
      },
      { status: 400 },
    );
  }

  let response: Response;
  try {
    response = await fetch(oembedUrl);
  } catch {
    return unavailable("Embed service unavailable.", 502);
  }

  if (!response.ok) {
    // Covers private/deleted posts as well as genuine upstream failures —
    // same graceful "no embed" outcome either way (ROADMAP.md M2).
    return unavailable("Couldn't load an embed for that link.", 502);
  }

  const body = (await response.json()) as { html?: string };
  if (!body.html) {
    return unavailable("Couldn't load an embed for that link.", 502);
  }

  return NextResponse.json({ html: body.html, provider });
}
