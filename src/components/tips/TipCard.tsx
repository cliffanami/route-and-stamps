"use client";

import { useState } from "react";
import { Card, CardBody, CardMeta } from "@/components/ui/Card";
import { Tag } from "@/components/ui/Tag";
import { Button } from "@/components/ui/Button";
import {
  EmbedPanel,
  PROVIDER_LABEL,
  type EmbedProvider,
} from "@/components/ui/EmbedPanel";
import type { Tip } from "@/types/database.types";

interface TipCardProps {
  tip: Tip;
  relatedPlaceName?: string;
}

// tips has no provider column — inferred from the hostname, same as places'
// PlaceDetail.inferProvider (ROADMAP.md M2/M3 share the two supported
// providers).
function inferProvider(sourceUrl: string | null): EmbedProvider | null {
  if (!sourceUrl) return null;
  try {
    const hostname = new URL(sourceUrl).hostname.replace(/^www\./, "");
    if (hostname === "instagram.com") return "instagram";
    if (hostname === "tiktok.com" || hostname === "vm.tiktok.com")
      return "tiktok";
  } catch {
    // fall through
  }
  return null;
}

export function TipCard({ tip, relatedPlaceName }: TipCardProps) {
  const [expanded, setExpanded] = useState(false);
  const provider = inferProvider(tip.source_url);
  const hasRenderableEmbed = tip.embed_html !== null && provider !== null;

  return (
    <Card>
      <CardMeta>
        <Tag variant="accent">{tip.category}</Tag>
        {tip.format === "video" && <Tag variant="outline">Video</Tag>}
      </CardMeta>

      {tip.format === "text" ? (
        <CardBody>{tip.content_text}</CardBody>
      ) : (
        <div>
          {hasRenderableEmbed ? (
            expanded ? (
              <EmbedPanel html={tip.embed_html!} provider={provider} />
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
            tip.source_url && (
              <a
                href={tip.source_url}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-secondary btn-block"
              >
                {provider
                  ? `View on ${PROVIDER_LABEL[provider]}`
                  : "View original link"}{" "}
                ↗
              </a>
            )
          )}
        </div>
      )}

      {relatedPlaceName && <CardMeta>Near {relatedPlaceName}</CardMeta>}
    </Card>
  );
}
