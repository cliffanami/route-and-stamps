"use client";

import dynamic from "next/dynamic";

// Tiptap/ProseMirror is ~350KB — deferred out of Place Detail/Add-a-Place/
// Stop Detail's initial route bundle (all three statically imported
// RichTextEditor directly, so every visit downloaded it even when nobody
// opened edit mode) via the same dynamic-import pattern StopAreaMapLoader
// already uses for Leaflet. ssr: false for the same reason as that
// loader: a contentEditable-driven editor shouldn't render during SSR.
const RichTextEditor = dynamic(
  () => import("./RichTextEditor").then((mod) => mod.RichTextEditor),
  {
    ssr: false,
    loading: () => <div className="input" style={{ minHeight: 90 }} />,
  },
);

export { RichTextEditor as RichTextEditorLoader };
