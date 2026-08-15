import type { MetadataRoute } from "next";

// Placeholder icons — a plain Broadsheet cyan/paper mark, not real branding
// (ARCHITECTURE.md §1b's tokens, generated with no design input). Swap
// public/icons/icon-*.png for real artwork whenever it exists; nothing
// else needs to change.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Route & Stamps",
    short_name: "Route & Stamps",
    description: "Collaborative trip planning for two.",
    start_url: "/",
    display: "standalone",
    background_color: "#f3f2f2",
    theme_color: "#0088b0",
    icons: [
      {
        src: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-192.png",
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
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
