"use client";

import { CalendarPlus } from "@phosphor-icons/react";
import { generateIcs, type IcsEvent } from "@/lib/calendar/generate-ics";

interface AddToCalendarLinkProps {
  event: IcsEvent;
  filename: string;
  // StopDetail uses the full label-and-icon .btn treatment
  // (OpenInGoogleMapsLink's exact pattern); TodoRow's compact card needs an
  // icon-only variant instead.
  iconOnly?: boolean;
}

// A downloaded .ics file opens the device's own calendar app on import —
// works with any calendar (Apple, Google, Outlook), not just Google
// Calendar, matching the "work with native calendars" ask directly
// (ROADMAP.md Milestone AF).
export function AddToCalendarLink({ event, filename, iconOnly }: AddToCalendarLinkProps) {
  const href = `data:text/calendar;charset=utf-8,${encodeURIComponent(generateIcs(event))}`;

  if (iconOnly) {
    return (
      <a
        href={href}
        download={filename}
        className="btn btn-ghost btn-icon"
        aria-label="Add to calendar"
      >
        <CalendarPlus weight="duotone" size={18} />
      </a>
    );
  }

  return (
    <a href={href} download={filename} className="btn btn-secondary">
      <CalendarPlus weight="duotone" size={20} />
      Add to calendar
    </a>
  );
}
