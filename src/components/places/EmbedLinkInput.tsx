"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import { useAttachPlaceEmbed } from "@/lib/queries/use-places";

interface EmbedLinkInputProps {
  tripId: string;
  placeId: string;
  initialUrl: string | null;
}

// Reused from both the Add form and the Place detail page — pasting or
// changing a link fetches oEmbed html once and caches it on the place
// (ROADMAP.md M2), rather than re-fetching on every view.
export function EmbedLinkInput({
  tripId,
  placeId,
  initialUrl,
}: EmbedLinkInputProps) {
  const attachEmbed = useAttachPlaceEmbed(tripId);
  const { showToast } = useToast();
  const [url, setUrl] = useState(initialUrl ?? "");
  const [error, setError] = useState<string | null>(null);

  async function handleSave() {
    setError(null);
    try {
      await attachEmbed.mutateAsync({ placeId, sourceUrl: url.trim() || null });
      showToast("Link saved");
    } catch {
      setError("Couldn't save that link — try again.");
    }
  }

  return (
    <div className="field">
      <label htmlFor="embed-url">Instagram or TikTok link</label>
      <input
        id="embed-url"
        className="input"
        value={url}
        onChange={(event) => setUrl(event.target.value)}
        placeholder="https://www.instagram.com/reel/..."
      />
      <Button
        type="button"
        variant="secondary"
        onClick={handleSave}
        disabled={attachEmbed.isPending}
      >
        {attachEmbed.isPending ? "Saving…" : "Save link"}
      </Button>
      {error && <p className="text-muted">{error}</p>}
    </div>
  );
}
