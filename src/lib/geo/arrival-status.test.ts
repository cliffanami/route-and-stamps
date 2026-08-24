import { describe, expect, it } from "vitest";
import { arrivalStatus } from "./arrival-status";
import type { Stop, StopCheckin } from "@/types/database.types";

function makeStop(overrides: Partial<Stop>): Stop {
  return {
    id: "stop-1",
    trip_id: "trip-1",
    name: "Stop",
    town: null,
    lat: 0,
    lng: 0,
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
    created_at: "",
    ...overrides,
  };
}

function makeCheckin(overrides: Partial<StopCheckin>): StopCheckin {
  return {
    stop_id: "stop-1",
    user_id: "user-1",
    checked_in_at: new Date().toISOString(),
    ...overrides,
  };
}

describe("arrivalStatus", () => {
  it("is 'none' when no arrival time/date has passed and nobody's checked in", () => {
    const stop = makeStop({ start_date: "2999-01-01" });
    expect(arrivalStatus(stop, [])).toBe("none");
  });

  it("is 'estimated' once start_date has passed with nobody checked in", () => {
    const stop = makeStop({ start_date: "2000-01-01" });
    expect(arrivalStatus(stop, [])).toBe("estimated");
  });

  it("is 'estimated' once arrival_time has passed, taking priority over start_date", () => {
    const stop = makeStop({ start_date: "2999-01-01", arrival_time: "2000-01-01T00:00:00Z" });
    expect(arrivalStatus(stop, [])).toBe("estimated");
  });

  it("is 'none' for a pending stop even if its start_date has passed", () => {
    const stop = makeStop({ start_date: "2000-01-01", is_pending: true });
    expect(arrivalStatus(stop, [])).toBe("none");
  });

  it("is 'confirmed' once anyone has checked in, regardless of estimate timing", () => {
    const stop = makeStop({ id: "stop-1", start_date: "2999-01-01" });
    const checkins = [makeCheckin({ stop_id: "stop-1" })];
    expect(arrivalStatus(stop, checkins)).toBe("confirmed");
  });

  it("ignores checkins for a different stop", () => {
    const stop = makeStop({ id: "stop-1", start_date: "2999-01-01" });
    const checkins = [makeCheckin({ stop_id: "stop-2" })];
    expect(arrivalStatus(stop, checkins)).toBe("none");
  });
});
