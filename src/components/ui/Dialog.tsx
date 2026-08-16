"use client";

import { useEffect, type ReactNode } from "react";

interface DialogProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  actions?: ReactNode;
}

export function Dialog({ open, onClose, title, children, actions }: DialogProps) {
  useEffect(() => {
    if (!open) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="dialog-backdrop"
      onClick={onClose}
      style={{
        // Same Chromium/Leaflet compositing bug already found and fixed on
        // BottomNav: Leaflet's GPU-composited map layers can paint above a
        // sibling position:fixed element that has no explicit stacking
        // context of its own — .dialog-backdrop has position:fixed but no
        // z-index, so on any page with a map (e.g. PlaceDetail's "Add a
        // cost" dialog) the map was rendering on top of the dialog box
        // instead of behind it. Leaflet's own highest internal z-index is
        // 1000 (.leaflet-top/.leaflet-bottom); this needs to clear that.
        isolation: "isolate",
        zIndex: 2000,
      }}
    >
      <div
        className="dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="dialog-title"
        onClick={(event) => event.stopPropagation()}
      >
        <h2 id="dialog-title" className="dialog-title">
          {title}
        </h2>
        <div className="dialog-body">{children}</div>
        {actions && <div className="dialog-actions">{actions}</div>}
      </div>
    </div>
  );
}
