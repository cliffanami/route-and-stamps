"use client";

import { useState } from "react";
import { ChatCircleText } from "@phosphor-icons/react";
import { ChatDrawer } from "./ChatDrawer";

interface ChatButtonProps {
  tripId: string;
}

// The 4th top-nav icon (ROADMAP.md Milestone G) — reachable from any trip
// page, not a bottom-nav destination, since the assistant is meant to sit
// alongside whatever you're already doing, not be navigated to.
export function ChatButton({ tripId }: ChatButtonProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        aria-label="Ask the assistant"
        className="inline-flex items-center justify-center p-2"
        onClick={() => setOpen(true)}
      >
        <ChatCircleText weight="duotone" size={24} />
      </button>
      <ChatDrawer tripId={tripId} open={open} onClose={() => setOpen(false)} />
    </>
  );
}
