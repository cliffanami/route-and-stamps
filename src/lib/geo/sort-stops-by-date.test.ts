import { describe, expect, it } from "vitest";
import { sortStopsByDate } from "./sort-stops-by-date";
import type { Stop } from "@/types/database.types";

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

describe("sortStopsByDate", () => {
  it("sorts dated stops chronologically regardless of order_index", () => {
    const late = makeStop({ id: "a", order_index: 1, start_date: "2026-11-05" });
    const early = makeStop({ id: "b", order_index: 8, start_date: "2026-10-26" });
    const result = sortStopsByDate([late, early]);
    expect(result.map((s) => s.id)).toEqual(["b", "a"]);
  });

  it("puts undated stops after every dated stop", () => {
    const dated = makeStop({ id: "a", order_index: 1, start_date: "2026-11-05" });
    const undated = makeStop({ id: "b", order_index: 0, start_date: null });
    const result = sortStopsByDate([undated, dated]);
    expect(result.map((s) => s.id)).toEqual(["a", "b"]);
  });

  it("falls back to order_index among undated stops", () => {
    const second = makeStop({ id: "a", order_index: 2, start_date: null });
    const first = makeStop({ id: "b", order_index: 1, start_date: null });
    const result = sortStopsByDate([second, first]);
    expect(result.map((s) => s.id)).toEqual(["b", "a"]);
  });

  it("doesn't mutate the input array", () => {
    const stops = [
      makeStop({ id: "a", order_index: 2 }),
      makeStop({ id: "b", order_index: 1 }),
    ];
    const original = [...stops];
    sortStopsByDate(stops);
    expect(stops).toEqual(original);
  });
});
