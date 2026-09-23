"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

interface BottomSheetProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}

const SWIPE_DISMISS_THRESHOLD_PX = 80;

// Bottom-anchored slide-up panel, distinct from Dialog's centered modal —
// used for the trip map's marker sheet (ROADMAP.md Milestone AG), which
// replaces Leaflet's own marker popup so the map stays visible/interactive
// underneath rather than navigating away.
export function BottomSheet({ open, onClose, title, children }: BottomSheetProps) {
  const [dragOffset, setDragOffset] = useState(0);
  const dragStartY = useRef<number | null>(null);

  useEffect(() => {
    if (!open) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  function handlePointerDown(event: React.PointerEvent) {
    dragStartY.current = event.clientY;
  }

  function handlePointerMove(event: React.PointerEvent) {
    if (dragStartY.current === null) return;
    const delta = event.clientY - dragStartY.current;
    if (delta > 0) setDragOffset(delta);
  }

  function handlePointerUp() {
    const shouldClose = dragOffset > SWIPE_DISMISS_THRESHOLD_PX;
    setDragOffset(0);
    dragStartY.current = null;
    if (shouldClose) onClose();
  }

  return (
    <div
      className="sheet-backdrop"
      onClick={onClose}
      style={{
        // Same Chromium/Leaflet compositing bug Dialog's backdrop already
        // fixes — the map this sheet sits over is the exact scenario that
        // bug describes.
        isolation: "isolate",
        zIndex: 2000,
      }}
    >
      <div
        className="sheet"
        role="dialog"
        aria-modal="true"
        aria-labelledby="sheet-title"
        onClick={(event) => event.stopPropagation()}
        style={{
          transform: dragOffset ? `translateY(${dragOffset}px)` : undefined,
          transition: dragOffset ? "none" : undefined,
        }}
      >
        <div
          className="sheet-handle"
          aria-hidden="true"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
        />
        <h2 id="sheet-title" className="sheet-title">
          {title}
        </h2>
        <div className="sheet-body">{children}</div>
      </div>
    </div>
  );
}
