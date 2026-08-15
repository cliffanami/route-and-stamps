"use client";

import { useEffect, useRef } from "react";

export type EmbedProvider = "instagram" | "tiktok";

export const PROVIDER_LABEL: Record<EmbedProvider, string> = {
  instagram: "Instagram",
  tiktok: "TikTok",
};

const EMBED_SCRIPT_SRC: Record<EmbedProvider, string> = {
  instagram: "https://www.instagram.com/embed.js",
  tiktok: "https://www.tiktok.com/embed.js",
};

interface EmbedPanelProps {
  html: string;
  provider: EmbedProvider;
}

// Instagram/TikTok's oEmbed html is a <blockquote> that their own widget
// script scans for and replaces with the real iframe. React won't execute a
// <script> tag inserted via dangerouslySetInnerHTML, and browsers only run a
// freshly-created <script> element — so re-processing on each mount means
// creating a new one each time, not reusing next/script's src-deduped tag.
// Shared by places' MediaSlider and tips' TipCard (ROADMAP.md M2 + M3) —
// same browser trick either way, not worth two copies that could drift.
export function EmbedPanel({ html, provider }: EmbedPanelProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    container.innerHTML = html;

    const script = document.createElement("script");
    script.src = EMBED_SCRIPT_SRC[provider];
    script.async = true;
    document.body.appendChild(script);

    return () => {
      document.body.removeChild(script);
    };
  }, [html, provider]);

  return <div ref={containerRef} />;
}
