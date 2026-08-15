"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import {
  EmbedPanel,
  PROVIDER_LABEL,
  type EmbedProvider,
} from "@/components/ui/EmbedPanel";
import { usePlacePhotoUrl } from "@/lib/queries/use-place-photo-url";

interface MediaSliderProps {
  photoPath: string | null;
  embedHtml: string | null;
  provider: EmbedProvider | null;
  sourceUrl: string | null;
  placeName: string;
}

function PhotoPanel({
  photoPath,
  placeName,
}: {
  photoPath: string;
  placeName: string;
}) {
  const { data: signedUrl, isLoading, error } = usePlacePhotoUrl(photoPath);

  if (error) {
    return (
      <div className="flex min-w-full items-center justify-center p-6 text-muted">
        Couldn&rsquo;t load photo:{" "}
        {error instanceof Error ? error.message : String(error)}
      </div>
    );
  }

  if (isLoading || !signedUrl) {
    return (
      <div className="flex min-w-full items-center justify-center p-6 text-muted">
        Loading photo…
      </div>
    );
  }

  return (
    <div className="halftone min-w-full">
      {/* eslint-disable-next-line @next/next/no-img-element -- signed URL, not a static asset next/image can optimize */}
      <img
        src={signedUrl}
        alt={placeName}
        className="w-full object-cover"
        style={{ aspectRatio: "4 / 3" }}
      />
    </div>
  );
}

// Photo above, link/embed below — a plain vertical stack, not a swipeable
// slider. An earlier version put the link panel behind a horizontal swipe
// with dot indicators, but that's not a reliable discovery pattern on
// mobile; stacking means both are visible with no gesture required. A saved
// link always gets a panel, even when there's no embed_html to render (a
// failed/unconfigured oEmbed fetch, or a private/deleted post) — falls back
// to a plain "View on Instagram/TikTok" link rather than disappearing, since
// disappearing is what made a successfully-saved link look broken.
export function MediaSlider({
  photoPath,
  embedHtml,
  provider,
  sourceUrl,
  placeName,
}: MediaSliderProps) {
  const [expanded, setExpanded] = useState(false);
  const hasPhoto = photoPath !== null;
  const hasLink = sourceUrl !== null;
  const hasRenderableEmbed = embedHtml !== null && provider !== null;

  if (!hasPhoto && !hasLink) return null;

  return (
    <div className="flex flex-col gap-3">
      {hasPhoto && <PhotoPanel photoPath={photoPath} placeName={placeName} />}
      {hasLink && (
        <div>
          {hasRenderableEmbed ? (
            expanded ? (
              <EmbedPanel html={embedHtml} provider={provider} />
            ) : (
              <Button
                type="button"
                variant="secondary"
                block
                onClick={() => setExpanded(true)}
              >
                Show {PROVIDER_LABEL[provider]} embed
              </Button>
            )
          ) : (
            <a
              href={sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-secondary btn-block"
            >
              {provider
                ? `View on ${PROVIDER_LABEL[provider]}`
                : "View original link"}{" "}
              ↗
            </a>
          )}
        </div>
      )}
    </div>
  );
}
