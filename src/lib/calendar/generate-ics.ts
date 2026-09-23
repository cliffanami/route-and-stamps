import { parsePlainDate } from "@/lib/text/format-plain-date";
import type { Stop, Todo } from "@/types/database.types";

export interface IcsEvent {
  uid: string;
  title: string;
  location?: string;
  // A date-only event (no specific time) vs. a specific instant — an
  // all-day event's start/end are calendar dates, not Date objects with a
  // meaningful time component.
  allDay: boolean;
  start: Date;
  end?: Date;
}

function escapeIcsText(text: string): string {
  return text
    .replace(/\\/g, "\\\\")
    .replace(/,/g, "\\,")
    .replace(/;/g, "\\;")
    .replace(/\n/g, "\\n");
}

// Local calendar-date parts, not toISOString() — an all-day event's date is
// a calendar date, and converting a local-midnight Date to UTC can shift it
// by a day depending on the viewer's timezone offset, the same class of bug
// format-plain-date.ts's parsePlainDate already exists to avoid.
function formatIcsDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}${month}${day}`;
}

// A real instant (e.g. a flight arrival) — UTC conversion is correct here,
// unlike formatIcsDate's calendar-date case.
function formatIcsDateTime(date: Date): string {
  return date.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
}

export function generateIcs(event: IcsEvent): string {
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Route and Stamps//EN",
    "BEGIN:VEVENT",
    `UID:${event.uid}@routeandstamps`,
    `DTSTAMP:${formatIcsDateTime(new Date())}`,
  ];

  if (event.allDay) {
    lines.push(`DTSTART;VALUE=DATE:${formatIcsDate(event.start)}`);
    // DTEND is exclusive for all-day events (RFC 5545) — one calendar day
    // past the last inclusive day, not the last day itself.
    const exclusiveEnd = new Date(event.end ?? event.start);
    exclusiveEnd.setDate(exclusiveEnd.getDate() + 1);
    lines.push(`DTEND;VALUE=DATE:${formatIcsDate(exclusiveEnd)}`);
  } else {
    lines.push(`DTSTART:${formatIcsDateTime(event.start)}`);
    if (event.end) lines.push(`DTEND:${formatIcsDateTime(event.end)}`);
  }

  lines.push(`SUMMARY:${escapeIcsText(event.title)}`);
  if (event.location) lines.push(`LOCATION:${escapeIcsText(event.location)}`);
  lines.push("END:VEVENT", "END:VCALENDAR");

  return lines.join("\r\n");
}

const ONE_HOUR_MS = 60 * 60 * 1000;

// arrival_time (a real timestamp) takes precedence when set, for a precise
// timed event; otherwise falls back to an all-day event spanning
// start_date..end_date — whichever of the stop's existing fields is
// available (ROADMAP.md Milestone AF). Returns null when the stop has no
// date data at all — nothing to put on a calendar.
export function stopToIcsEvent(stop: Stop): IcsEvent | null {
  if (stop.arrival_time) {
    const start = new Date(stop.arrival_time);
    return {
      uid: `stop-${stop.id}`,
      title: `Arrive: ${stop.name}`,
      location: stop.town ?? stop.name,
      allDay: false,
      start,
      end: new Date(start.getTime() + ONE_HOUR_MS),
    };
  }

  if (stop.start_date) {
    return {
      uid: `stop-${stop.id}`,
      title: stop.name,
      location: stop.town ?? stop.name,
      allDay: true,
      start: parsePlainDate(stop.start_date),
      end: stop.end_date ? parsePlainDate(stop.end_date) : undefined,
    };
  }

  return null;
}

// due_date only — a todo with no due date has nothing to put on a calendar
// (ROADMAP.md Milestone AF).
export function todoToIcsEvent(todo: Todo): IcsEvent | null {
  if (!todo.due_date) return null;

  return {
    uid: `todo-${todo.id}`,
    title: todo.text,
    allDay: true,
    start: parsePlainDate(todo.due_date),
  };
}
