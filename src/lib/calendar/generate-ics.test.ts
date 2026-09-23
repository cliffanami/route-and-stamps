import { describe, expect, it } from "vitest";
import { generateIcs, stopToIcsEvent, todoToIcsEvent } from "./generate-ics";
import type { Stop, Todo } from "@/types/database.types";

function makeStop(overrides: Partial<Stop>): Stop {
  return {
    id: "stop-1",
    trip_id: "trip-1",
    name: "Kyoto",
    town: "Kyoto",
    lat: 35,
    lng: 135,
    order_index: 1,
    date_label: null,
    is_pending: false,
    guide_info: null,
    flight_info: null,
    start_date: null,
    end_date: null,
    arrival_time: null,
    description: null,
    transport_mode: null,
    transport_detail: null,
    transport_cost_status: null,
    departure_point: null,
    arrival_point: null,
    created_at: new Date().toISOString(),
    ...overrides,
  };
}

function makeTodo(overrides: Partial<Todo>): Todo {
  return {
    id: "todo-1",
    trip_id: "trip-1",
    text: "Apply for visa",
    is_done: false,
    due_date: null,
    related_place_id: null,
    phase: null,
    added_by: "user-1",
    created_at: new Date().toISOString(),
    ...overrides,
  };
}

describe("generateIcs", () => {
  it("produces a valid VCALENDAR/VEVENT wrapper", () => {
    const ics = generateIcs({
      uid: "abc",
      title: "Test event",
      allDay: true,
      start: new Date(2026, 9, 1),
    });
    expect(ics).toContain("BEGIN:VCALENDAR");
    expect(ics).toContain("BEGIN:VEVENT");
    expect(ics).toContain("UID:abc@routeandstamps");
    expect(ics).toContain("SUMMARY:Test event");
    expect(ics).toContain("END:VEVENT");
    expect(ics).toContain("END:VCALENDAR");
  });

  it("formats an all-day event as a VALUE=DATE range with an exclusive end", () => {
    const ics = generateIcs({
      uid: "abc",
      title: "Multi-day stay",
      allDay: true,
      start: new Date(2026, 9, 1),
      end: new Date(2026, 9, 3),
    });
    expect(ics).toContain("DTSTART;VALUE=DATE:20261001");
    // Exclusive end — one day past the last inclusive day (Oct 3 -> Oct 4).
    expect(ics).toContain("DTEND;VALUE=DATE:20261004");
  });

  it("defaults an all-day event's end to the day after start when no end given", () => {
    const ics = generateIcs({
      uid: "abc",
      title: "Single day",
      allDay: true,
      start: new Date(2026, 9, 1),
    });
    expect(ics).toContain("DTSTART;VALUE=DATE:20261001");
    expect(ics).toContain("DTEND;VALUE=DATE:20261002");
  });

  it("formats a timed event with UTC DTSTART/DTEND", () => {
    const ics = generateIcs({
      uid: "abc",
      title: "Flight arrival",
      allDay: false,
      start: new Date(Date.UTC(2026, 9, 1, 14, 30, 0)),
      end: new Date(Date.UTC(2026, 9, 1, 15, 30, 0)),
    });
    expect(ics).toContain("DTSTART:20261001T143000Z");
    expect(ics).toContain("DTEND:20261001T153000Z");
  });

  it("escapes commas, semicolons, and backslashes in text fields", () => {
    const ics = generateIcs({
      uid: "abc",
      title: "Lunch, then museum; also \\ backslash",
      allDay: true,
      start: new Date(2026, 9, 1),
    });
    expect(ics).toContain("SUMMARY:Lunch\\, then museum\\; also \\\\ backslash");
  });
});

describe("stopToIcsEvent", () => {
  it("returns null when the stop has no date data at all", () => {
    expect(stopToIcsEvent(makeStop({}))).toBeNull();
  });

  it("builds an all-day event from start_date/end_date when there's no arrival_time", () => {
    const event = stopToIcsEvent(
      makeStop({ start_date: "2026-10-01", end_date: "2026-10-03" }),
    );
    expect(event).not.toBeNull();
    expect(event!.allDay).toBe(true);
    expect(event!.title).toBe("Kyoto");
    expect(event!.start.getFullYear()).toBe(2026);
    expect(event!.start.getMonth()).toBe(9);
    expect(event!.start.getDate()).toBe(1);
    expect(event!.end!.getDate()).toBe(3);
  });

  it("prefers arrival_time over start_date/end_date when both are present", () => {
    const event = stopToIcsEvent(
      makeStop({
        start_date: "2026-10-01",
        end_date: "2026-10-03",
        arrival_time: "2026-10-01T14:30:00.000Z",
      }),
    );
    expect(event!.allDay).toBe(false);
    expect(event!.title).toBe("Arrive: Kyoto");
  });

  it("uses the stop name as location when town is null", () => {
    const event = stopToIcsEvent(
      makeStop({ start_date: "2026-10-01", town: null }),
    );
    expect(event!.location).toBe("Kyoto");
  });
});

describe("todoToIcsEvent", () => {
  it("returns null when the todo has no due date", () => {
    expect(todoToIcsEvent(makeTodo({}))).toBeNull();
  });

  it("builds an all-day event from due_date", () => {
    const event = todoToIcsEvent(makeTodo({ due_date: "2026-10-05", text: "Buy insurance" }));
    expect(event).not.toBeNull();
    expect(event!.allDay).toBe(true);
    expect(event!.title).toBe("Buy insurance");
    expect(event!.start.getDate()).toBe(5);
  });
});
