import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { formatMinor } from "@/lib/money/currency";
import { CHAT_TOOLS } from "@/lib/validation/chat-tools";

// ROADMAP.md Milestone G — same gated-Route-Handler shape as M1.5's
// extract-place (ENABLE_AI_CHAT default off, graceful "unavailable"
// fallback on any failure), but a chat turn rather than a single
// extraction. Sonnet, not Haiku — picking the right tool (or none) from
// open-ended phrasing is a harder job than extract-place's single-field
// task, and the existing Anthropic Console spend cap is the real cost
// backstop regardless of which model is used, not a per-feature one.

const REQUEST_TIMEOUT_MS = 15_000;
const MAX_TURNS = 20;

const bodySchema = z.object({
  tripId: z.string().uuid(),
  messages: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string().trim().min(1).max(4000),
      }),
    )
    .min(1)
    .max(MAX_TURNS),
});

function unavailable(message: string, status: number) {
  return NextResponse.json(
    { error: { code: "chat_unavailable", message } },
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

  if (process.env.ENABLE_AI_CHAT !== "true") {
    return unavailable("The chat assistant is disabled.", 503);
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return unavailable("The chat assistant is not configured.", 503);
  }

  const body = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: { code: "validation_error", message: parsed.error.issues[0].message } },
      { status: 400 },
    );
  }
  const { tripId, messages } = parsed.data;

  // Membership check via a real query, not just "the client sent a
  // tripId" — every field folded into the system prompt below comes
  // straight out of RLS-scoped queries, so this only proceeds if the
  // authenticated user is actually a member of this trip.
  const { data: trip, error: tripError } = await supabase
    .from("trips")
    .select("name, currencies")
    .eq("id", tripId)
    .maybeSingle();
  if (tripError || !trip) {
    return unavailable("Couldn't load this trip.", 404);
  }

  const [{ data: stops }, { data: places }, { data: votes }, { data: budgetLines }] =
    await Promise.all([
      supabase.from("stops").select("id, name").eq("trip_id", tripId),
      supabase.from("places").select("id, name").eq("trip_id", tripId),
      supabase
        .from("votes")
        .select("place_id, user_id, level, places!inner(trip_id, name)")
        .eq("places.trip_id", tripId),
      supabase
        .from("budget_lines")
        .select("description, amount_minor, currency, category")
        .eq("trip_id", tripId),
    ]);

  const placeNames = (places ?? []).map((p) => p.name);
  const stopNames = (stops ?? []).map((s) => s.name);

  const myVotedPlaceIds = new Set(
    (votes ?? []).filter((v) => v.user_id === user.id).map((v) => v.place_id),
  );
  const unvotedPlaces = (places ?? [])
    .filter((p) => !myVotedPlaceIds.has(p.id))
    .map((p) => p.name);

  const spendByCurrency = new Map<string, number>();
  for (const line of budgetLines ?? []) {
    spendByCurrency.set(
      line.currency,
      (spendByCurrency.get(line.currency) ?? 0) + line.amount_minor,
    );
  }
  const spendSummary = Array.from(spendByCurrency.entries())
    .map(([currency, minor]) => formatMinor(minor, currency))
    .join(", ") || "nothing logged yet";

  const systemPrompt = `You are a trip-planning assistant inside Route & Stamps, helping with the trip "${trip.name}".

Current stops: ${stopNames.length > 0 ? stopNames.join(", ") : "none yet"}
Current places: ${placeNames.length > 0 ? placeNames.join(", ") : "none yet"}
Places the requesting user hasn't voted on yet: ${unvotedPlaces.length > 0 ? unvotedPlaces.join(", ") : "none — everything's voted on"}
Total logged so far: ${spendSummary}
Trip currencies in use: ${trip.currencies.join(", ") || "none configured"}

Answer read-only questions about the trip (like "what's unvoted" or "how much have we spent") directly and conversationally using the data above — never invent data that isn't listed here. For anything that changes trip data (adding a place, a tip, a vote, or a cost), call the matching tool instead of just describing what you'd do; the app shows the user a confirmation before anything is actually saved, so propose the tool call rather than asking the user to confirm in words. If a request doesn't match any tool and isn't a read-only question, say so plainly rather than guessing.`;

  const client = new Anthropic({ apiKey });

  try {
    const response = await client.messages.create(
      {
        model: "claude-sonnet-5",
        max_tokens: 1024,
        system: systemPrompt,
        tools: CHAT_TOOLS as unknown as Anthropic.Tool[],
        messages: messages.map((m) => ({ role: m.role, content: m.content })),
      },
      { timeout: REQUEST_TIMEOUT_MS },
    );

    if (response.stop_reason === "refusal") {
      return unavailable("The assistant declined to answer that.", 502);
    }

    const toolUse = response.content.find((block) => block.type === "tool_use");
    const textBlocks = response.content.filter((block) => block.type === "text");
    const text = textBlocks.map((block) => block.text).join("\n\n") || null;

    if (toolUse && toolUse.type === "tool_use") {
      return NextResponse.json({
        type: "tool_call",
        tool: toolUse.name,
        input: toolUse.input,
        text,
      });
    }

    if (!text) {
      return unavailable("The assistant returned no response.", 502);
    }

    return NextResponse.json({ type: "text", text });
  } catch (err) {
    if (err instanceof Anthropic.APIConnectionTimeoutError) {
      return unavailable("The assistant timed out.", 504);
    }
    return unavailable("The chat assistant is unavailable.", 502);
  }
}
