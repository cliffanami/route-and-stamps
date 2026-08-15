"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import { useAddTip } from "@/lib/queries/use-tips";
import { usePlaces } from "@/lib/queries/use-places";
import type { TipFormat } from "@/types/database.types";

interface TipFormProps {
  tripId: string;
  onDone: () => void;
  existingCategories: string[];
}

// Category is free-form (schema.sql comment: "not an enum" — PRD §6.4), so
// suggestions come from a <datalist> of categories already in use on this
// trip rather than a fixed list.
export function TipForm({ tripId, onDone, existingCategories }: TipFormProps) {
  const addTip = useAddTip(tripId);
  const { data: places = [] } = usePlaces(tripId);
  const { showToast } = useToast();

  const [category, setCategory] = useState("");
  const [format, setFormat] = useState<TipFormat>("text");
  const [contentText, setContentText] = useState("");
  const [sourceUrl, setSourceUrl] = useState("");
  const [relatedPlaceId, setRelatedPlaceId] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);

    try {
      await addTip.mutateAsync({
        category,
        format,
        content_text: format === "text" ? contentText.trim() || null : null,
        source_url: format === "video" ? sourceUrl.trim() || null : null,
        related_place_id: relatedPlaceId || null,
      });
      showToast("Tip saved");
      onDone();
    } catch {
      setError("Couldn't save that tip — try again.");
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="field">
        <label htmlFor="tip-category">Category</label>
        <input
          id="tip-category"
          className="input"
          list="tip-categories"
          value={category}
          onChange={(event) => setCategory(event.target.value)}
          required
        />
        <datalist id="tip-categories">
          {existingCategories.map((c) => (
            <option key={c} value={c} />
          ))}
        </datalist>
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

      {error && <p className="text-muted">{error}</p>}

      <Button type="submit" variant="primary" disabled={addTip.isPending}>
        {addTip.isPending ? "Saving…" : "Save tip"}
      </Button>
    </form>
  );
}
