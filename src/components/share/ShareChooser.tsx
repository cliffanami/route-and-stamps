"use client";

import { useRouter } from "next/navigation";
import { PlusCircle, Lightbulb } from "@phosphor-icons/react";
import { Button } from "@/components/ui/Button";

interface ShareChooserProps {
  tripId: string;
  sharedUrl?: string;
}

// Sits between the OS share sheet and the destination form (ROADMAP.md
// Milestone H) — always asks, never remembers a default, per explicit
// call. Same icons as BottomNav's Add/Tips tabs for visual continuity.
// Navigates via router.push rather than wrapping Button in a Link — Button
// renders a <button>, and <a><button> is invalid nesting.
export function ShareChooser({ tripId, sharedUrl }: ShareChooserProps) {
  const router = useRouter();
  const query = sharedUrl ? `?shared_url=${encodeURIComponent(sharedUrl)}` : "";

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-6 p-8 text-center">
      <div className="flex flex-col gap-2">
        <h1>Add this link as…</h1>
        <p className="text-muted">
          Choose where it goes — a Place to vote on, or a Tip with advice.
        </p>
      </div>

      <div className="flex w-full max-w-xs flex-col gap-3">
        <Button
          type="button"
          variant="primary"
          block
          onClick={() => router.push(`/trips/${tripId}/add${query}`)}
        >
          <PlusCircle weight="duotone" size={20} />
          Add as Place
        </Button>
        <Button
          type="button"
          variant="secondary"
          block
          onClick={() => router.push(`/trips/${tripId}/tips${query}`)}
        >
          <Lightbulb weight="duotone" size={20} />
          Add as Tip
        </Button>
      </div>
    </div>
  );
}
