"use client";

import { useState } from "react";
import { PaperPlaneTilt } from "@phosphor-icons/react";
import { Dialog } from "@/components/ui/Dialog";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import { useTrip } from "@/lib/queries/use-trip";
import { useStops } from "@/lib/queries/use-stops";
import { usePlaces } from "@/lib/queries/use-places";
import { useAddPlace } from "@/lib/queries/use-places";
import { useAddTip } from "@/lib/queries/use-tips";
import { useCastVote } from "@/lib/queries/use-votes";
import { useAddBudgetLine } from "@/lib/queries/use-budget-lines";
import { nearestStop } from "@/lib/geo/nearest-stop";
import { resolveIdByName } from "@/lib/queries/chat-actions";
import { VOTE_LEVEL_LABEL } from "@/components/places/VoteScale";
import {
  addPlaceToolInputSchema,
  addTipToolInputSchema,
  castVoteToolInputSchema,
  logBudgetLineToolInputSchema,
  type ChatToolName,
} from "@/lib/validation/chat-tools";

interface ChatDrawerProps {
  tripId: string;
  open: boolean;
  onClose: () => void;
}

interface UIMessage {
  role: "user" | "assistant";
  content: string;
}

interface PendingAction {
  tool: ChatToolName;
  input: unknown;
}

// ROADMAP.md Milestone G — chat history is ephemeral (component state,
// not a table): closing the drawer or reloading the page loses the
// conversation, but nothing it did along the way (a real place, a real
// vote) is lost, since every write goes through the same mutation hooks
// the manual forms already call.
export function ChatDrawer({ tripId, open, onClose }: ChatDrawerProps) {
  const { data: trip } = useTrip(tripId);
  const { data: stops = [] } = useStops(tripId);
  const { data: places = [] } = usePlaces(tripId);
  const addPlace = useAddPlace(tripId);
  const addTip = useAddTip(tripId);
  const castVote = useCastVote(tripId);
  const addBudgetLine = useAddBudgetLine(tripId);
  const { showToast } = useToast();

  const [messages, setMessages] = useState<UIMessage[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [pending, setPending] = useState<PendingAction | null>(null);
  const [confirmPending, setConfirmPending] = useState(false);
  const [confirmError, setConfirmError] = useState<string | null>(null);

  async function handleSend() {
    const text = input.trim();
    if (!text || sending) return;

    const nextMessages: UIMessage[] = [...messages, { role: "user", content: text }];
    setMessages(nextMessages);
    setInput("");
    setPending(null);
    setConfirmError(null);
    setSending(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tripId, messages: nextMessages }),
      });
      const body = await res.json();

      if (!res.ok) {
        setMessages((m) => [
          ...m,
          { role: "assistant", content: body.error?.message ?? "Couldn't reach the assistant — try the form instead." },
        ]);
        return;
      }

      if (body.type === "tool_call") {
        setMessages((m) => [
          ...m,
          { role: "assistant", content: body.text ?? "Here's what I'd do:" },
        ]);
        setPending({ tool: body.tool, input: body.input });
      } else {
        setMessages((m) => [...m, { role: "assistant", content: body.text }]);
      }
    } catch {
      setMessages((m) => [
        ...m,
        { role: "assistant", content: "Couldn't reach the assistant — try the form instead." },
      ]);
    } finally {
      setSending(false);
    }
  }

  async function handleConfirm() {
    if (!pending) return;
    setConfirmPending(true);
    setConfirmError(null);

    try {
      const doneText = await executeAction(pending);
      setMessages((m) => [...m, { role: "assistant", content: doneText }]);
      setPending(null);
      showToast("Done");
    } catch (err) {
      setConfirmError(err instanceof Error ? err.message : "Couldn't do that — try the form instead.");
    } finally {
      setConfirmPending(false);
    }
  }

  async function executeAction(action: PendingAction): Promise<string> {
    switch (action.tool) {
      case "add_place": {
        const input = addPlaceToolInputSchema.parse(action.input);
        const query = input.location_hint ? `${input.name}, ${input.location_hint}` : input.name;
        const geocodeRes = await fetch(`/api/geocode?q=${encodeURIComponent(query)}`);
        const geocodeBody = await geocodeRes.json();
        const top = geocodeRes.ok ? geocodeBody.results?.[0] : null;

        await addPlace.mutateAsync({
          name: input.name,
          source_url: null,
          note: null,
          lat: top?.lat ?? null,
          lng: top?.lng ?? null,
          town: top?.town ?? null,
          nearest_stop_id: top ? (nearestStop(top.lat, top.lng, stops)?.id ?? null) : null,
          date: null,
          meal_tags: [],
          is_accommodation: false,
        });
        return top
          ? `Added "${input.name}".`
          : `Added "${input.name}" — couldn't find a location for it, so it's saved without a pin.`;
      }
      case "add_tip": {
        const input = addTipToolInputSchema.parse(action.input);
        await addTip.mutateAsync({
          category: input.category,
          format: "text",
          title: null,
          content_text: input.content_text,
          source_url: null,
          video_caption: null,
          tags: [],
          related_place_id: resolveIdByName(input.related_place_name, places),
          related_stop_id: resolveIdByName(input.related_stop_name, stops),
        });
        return "Tip added.";
      }
      case "cast_vote": {
        const input = castVoteToolInputSchema.parse(action.input);
        const placeId = resolveIdByName(input.place_name, places);
        if (!placeId) throw new Error(`Couldn't find a place called "${input.place_name}".`);
        await castVote.mutateAsync({ placeId, level: input.level });
        return `Voted "${VOTE_LEVEL_LABEL[input.level]}" on ${input.place_name}.`;
      }
      case "log_budget_line": {
        const input = logBudgetLineToolInputSchema.parse(action.input);
        await addBudgetLine.mutateAsync({
          category: input.category,
          description: input.description,
          amount: input.amount,
          currency: input.currency || trip?.currencies[0] || "USD",
          status: "not_booked",
          paid_by: null,
          payment_details: null,
          due_date: null,
          place_id: null,
          stop_id: resolveIdByName(input.related_stop_name, stops),
        });
        return `Logged ${input.amount} ${input.currency} for ${input.description}.`;
      }
    }
  }

  function confirmSummary(action: PendingAction): string {
    try {
      switch (action.tool) {
        case "add_place": {
          const input = addPlaceToolInputSchema.parse(action.input);
          return `Add place: ${input.name}${input.location_hint ? ` (${input.location_hint})` : ""}`;
        }
        case "add_tip": {
          const input = addTipToolInputSchema.parse(action.input);
          return `Add tip (${input.category}): ${input.content_text}`;
        }
        case "cast_vote": {
          const input = castVoteToolInputSchema.parse(action.input);
          return `Vote "${VOTE_LEVEL_LABEL[input.level]}" on ${input.place_name}`;
        }
        case "log_budget_line": {
          const input = logBudgetLineToolInputSchema.parse(action.input);
          return `Log ${input.amount} ${input.currency} for ${input.description} (${input.category})`;
        }
      }
    } catch {
      return "Couldn't understand that proposed action.";
    }
  }

  function handleClose() {
    onClose();
  }

  return (
    <Dialog open={open} onClose={handleClose} title="Ask the assistant">
      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-2" style={{ maxHeight: "50vh", overflowY: "auto" }}>
          {messages.length === 0 && (
            <p className="text-muted">
              Ask me to add a place, jot a tip, cast a vote, log a cost, or ask what&rsquo;s
              still unvoted.
            </p>
          )}
          {messages.map((message, index) => (
            <div
              key={index}
              style={{
                alignSelf: message.role === "user" ? "flex-end" : "flex-start",
                maxWidth: "85%",
                background:
                  message.role === "user" ? "var(--color-accent-200)" : "var(--color-surface)",
                borderRadius: "var(--radius-md)",
                padding: "var(--space-2) var(--space-3)",
              }}
            >
              {message.content}
            </div>
          ))}
          {sending && <p className="text-muted">Thinking…</p>}
        </div>

        {pending && (
          <div
            className="flex flex-col gap-2"
            style={{
              border: "1px solid var(--color-divider)",
              borderRadius: "var(--radius-md)",
              padding: "var(--space-3)",
            }}
          >
            <p>{confirmSummary(pending)}</p>
            {confirmError && <p className="text-muted">{confirmError}</p>}
            <div className="flex gap-2">
              <Button
                type="button"
                variant="primary"
                onClick={handleConfirm}
                disabled={confirmPending}
              >
                {confirmPending ? "Saving…" : "Confirm"}
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={() => setPending(null)}
                disabled={confirmPending}
              >
                Cancel
              </Button>
            </div>
          </div>
        )}

        <div className="flex gap-2">
          <input
            className="input"
            style={{ flex: 1 }}
            value={input}
            onChange={(event) => setInput(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                handleSend();
              }
            }}
            placeholder="Type a message…"
            disabled={sending}
          />
          <Button
            type="button"
            variant="primary"
            icon
            onClick={handleSend}
            disabled={sending || !input.trim()}
            aria-label="Send"
          >
            <PaperPlaneTilt weight="duotone" size={20} />
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
