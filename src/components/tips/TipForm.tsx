"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import { useAddTip, useUpdateTip } from "@/lib/queries/use-tips";
import { usePlaces } from "@/lib/queries/use-places";
import { useStops } from "@/lib/queries/use-stops";
import type { Tip, TipFormat } from "@/types/database.types";

interface TipFormProps {
  tripId: string;
  onDone: () => void;
  // Strict select (ROADMAP.md Milestone A follow-up) — sourced from the
  // trip's own configured list (Trip Settings), not derived from
  // already-used values.
  categories: string[];
  tip?: Tip;
  // Web Share Target "Add as Tip" (ROADMAP.md Milestone H) lands here —
  // pre-fills the link field only, same as Add-a-Place's initialSourceUrl.
  // No oEmbed fetch triggered; that only happens later, matching the
  // manual-paste behavior this mirrors.
  initialSourceUrl?: string;
}

// Doubles as the edit form — pass an existing `tip` to prefill and update
// it instead of creating a new one.
export function TipForm({
  tripId,
  onDone,
  categories,
  tip,
  initialSourceUrl,
}: TipFormProps) {
  const addTip = useAddTip(tripId);
  const updateTip = useUpdateTip(tripId);
  const { data: places = [] } = usePlaces(tripId);
  const { data: stops = [] } = useStops(tripId);
  const { showToast } = useToast();
  const isEditing = tip !== undefined;

  const [category, setCategory] = useState(tip?.category ?? "");
  // Defensive: keeps a legacy category not in the current configured list
  // selectable when editing an existing tip.
  const categoryOptions = Array.from(
    new Set([...categories, ...(tip ? [tip.category] : [])]),
  );
  // A shared link only makes sense against the "video" format — its field
  // is the source_url one, unlike "text"'s content_text.
  const [format, setFormat] = useState<TipFormat>(
    tip?.format ?? (initialSourceUrl ? "video" : "text"),
  );
  const [contentText, setContentText] = useState(tip?.content_text ?? "");
  const [sourceUrl, setSourceUrl] = useState(
    tip?.source_url ?? initialSourceUrl ?? "",
  );
  const [relatedPlaceId, setRelatedPlaceId] = useState(
    tip?.related_place_id ?? "",
  );
  const [relatedStopId, setRelatedStopId] = useState(
    tip?.related_stop_id ?? "",
  );
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);

    const input = {
      category,
      format,
      content_text: format === "text" ? contentText.trim() || null : null,
      source_url: format === "video" ? sourceUrl.trim() || null : null,
      related_place_id: relatedPlaceId || null,
      related_stop_id: relatedStopId || null,
    };

    try {
      if (isEditing) {
        await updateTip.mutateAsync({ tipId: tip.id, ...input });
        showToast("Tip updated");
      } else {
        await addTip.mutateAsync(input);
        showToast("Tip saved");
      }
      onDone();
    } catch {
      setError("Couldn't save that tip — try again.");
    }
  }

  const pending = isEditing ? updateTip.isPending : addTip.isPending;

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="field">
        <label htmlFor="tip-category">Category</label>
        <select
          id="tip-category"
          className="input"
          value={category}
          onChange={(event) => setCategory(event.target.value)}
          required
        >
          <option value="">— Select —</option>
          {categoryOptions.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </div>

      <div className="seg" role="radiogroup" aria-label="Tip format">
        {(["text", "video"] as const).map((value) => (
          <label key={value} className="seg-opt">
            <input
              type="radio"
              name="tip-format"
              value={value}
              checked={format === value}
              onChange={() => setFormat(value)}
            />
            {value === "text" ? "Text" : "Video"}
          </label>
        ))}
      </div>

      {format === "text" ? (
        <div className="field">
          <label htmlFor="tip-content">Advice</label>
          <textarea
            id="tip-content"
            className="input"
            value={contentText}
            onChange={(event) => setContentText(event.target.value)}
          />
        </div>
      ) : (
        <div className="field">
          <label htmlFor="tip-url">Instagram or TikTok link</label>
          <input
            id="tip-url"
            className="input"
            value={sourceUrl}
            onChange={(event) => setSourceUrl(event.target.value)}
            placeholder="https://www.tiktok.com/@user/video/..."
          />
        </div>
      )}

      {places.length > 0 && (
        <div className="field">
          <label htmlFor="tip-place">Link to a place (optional)</label>
          <select
            id="tip-place"
            className="input"
            value={relatedPlaceId}
            onChange={(event) => setRelatedPlaceId(event.target.value)}
          >
            <option value="">— None —</option>
            {places.map((place) => (
              <option key={place.id} value={place.id}>
                {place.name}
              </option>
            ))}
          </select>
        </div>
      )}

      {stops.length > 0 && (
        <div className="field">
          <label htmlFor="tip-stop">Link to a stop (optional)</label>
          <select
            id="tip-stop"
            className="input"
            value={relatedStopId}
            onChange={(event) => setRelatedStopId(event.target.value)}
          >
            <option value="">— None —</option>
            {stops.map((stop) => (
              <option key={stop.id} value={stop.id}>
                {stop.name}
              </option>
            ))}
          </select>
        </div>
      )}

      {error && <p className="text-muted">{error}</p>}

      <Button type="submit" variant="primary" disabled={pending}>
        {pending ? "Saving…" : isEditing ? "Save changes" : "Save tip"}
      </Button>
    </form>
  );
}
