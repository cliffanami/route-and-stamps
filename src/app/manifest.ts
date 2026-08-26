import type { MetadataRoute } from "next";

// Placeholder icons — a plain Broadsheet cyan/paper mark, not real branding
// (ARCHITECTURE.md §1b's tokens, generated with no design input). Swap
// public/icons/icon-*.png for real artwork whenever it exists; nothing
// else needs to change.
//
// Separate maskable files (ROADMAP.md Milestone V) — Android's adaptive-icon
// mask (used for both the home-screen icon and the splash screen on
// Android 12+) can crop anything outside a centered safe-zone circle at 80%
// of the icon's diameter. The "any" purpose icons previously did double
// duty as "maskable" too, with the mark sized close to that boundary and no
// real margin — reported as "off" (cropped/off-center) on a Pixel. The
// maskable variants now carry the mark at a smaller, safely-inside-the-
// safe-zone size; "any" purpose icons are unaffected, unmasked contexts
// don't need the margin.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Route & Stamps",
    short_name: "Route & Stamps",
    description: "Collaborative trip planning for two.",
    start_url: "/",
    display: "standalone",
    background_color: "#f3f2f2",
    theme_color: "#0088b0",
    // Android only (ROADMAP.md Milestone B) — receiving a share has no iOS
    // implementation on any browser there (same WebKit engine under
    // Apple's requirement), so this is a manifest key iOS silently
    // ignores, not a runtime capability to detect and branch on.
    share_target: {
      action: "/share-target",
      method: "GET",
      params: {
        title: "shared_title",
        text: "shared_text",
        url: "shared_url",
      },
    },
    icons: [
      {
        src: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-192-maskable.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-512-maskable.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
