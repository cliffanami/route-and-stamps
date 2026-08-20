import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

// Tier 2 of M1.5's cascading place-name resolution (ARCHITECTURE.md §1c) —
// only ever called after Tier 1's Nominatim search returns zero results.
// Gated by ENABLE_AI_PLACE_EXTRACTION (default off) and a present
// ANTHROPIC_API_KEY; any failure here (disabled, missing key, upstream
// error, timeout, bad output) is caught and reported as a graceful
// "extraction unavailable" response — the caller falls back to Tier 1's
// result or the manual Inbox path, never a hard failure on add-a-place.

const REQUEST_TIMEOUT_MS = 8_000;

const bodySchema = z.object({
  text: z.string().trim().min(1, "text is required").max(2000),
});

const extractionSchema = {
  type: "object" as const,
  properties: {
    name: {
      type: "string",
      description: "The place's name, with abbreviations expanded",
    },
    location: {
      type: "string",
      description: "City, region, and/or country, as given or inferable",
    },
  },
  required: ["name", "location"],
  additionalProperties: false,
};

interface Extraction {
  name: string;
  location: string;
}

function unavailable(message: string, status: number) {
  return NextResponse.json(
    { error: { code: "extraction_unavailable", message } },
    { status },
  );
}

export async function POST(request: Request) {
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

  if (process.env.ENABLE_AI_PLACE_EXTRACTION !== "true") {
    return unavailable("AI place extraction is disabled.", 503);
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return unavailable("AI place extraction is not configured.", 503);
  }

  const body = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(body);
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

  const client = new Anthropic({ apiKey });

  let extraction: Extraction;
  try {
    const response = await client.messages.create(
      {
        model: "claude-haiku-4-5",
        max_tokens: 256,
        output_config: {
          format: { type: "json_schema", schema: extractionSchema },
        },
        messages: [
          {
            role: "user",
            content:
              "Extract the place name and its location (city, region, and/or country) " +
              "from this blurb. Expand abbreviations to their full name where confident " +
              "(e.g. 'KICC' -> 'Kenyatta International Convention Centre'). If no location " +
              "is mentioned or inferable, return an empty string for location.\n\n" +
              `Blurb: ${parsed.data.text}`,
          },
        ],
      },
      { timeout: REQUEST_TIMEOUT_MS },
    );

    if (response.stop_reason === "refusal") {
      return unavailable("Extraction was declined.", 502);
    }

    const textBlock = response.content.find((block) => block.type === "text");
    if (!textBlock || textBlock.type !== "text") {
      return unavailable("Extraction returned no result.", 502);
    }

    extraction = JSON.parse(textBlock.text) as Extraction;
  } catch (err) {
    if (err instanceof Anthropic.APIConnectionTimeoutError) {
      return unavailable("Extraction timed out.", 504);
    }
    return unavailable("Extraction service unavailable.", 502);
  }

  const query = extraction.location
    ? `${extraction.name}, ${extraction.location}`
    : extraction.name;

  return NextResponse.json({ query });
}
