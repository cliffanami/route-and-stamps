import { describe, expect, it } from "vitest";
import { currentStopFromCheckins, nextStopAfter } from "./current-stop";
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

describe("currentStopFromCheckins", () => {
  const tokyo = makeStop({ id: "tokyo", name: "Tokyo" });
  const kyoto = makeStop({ id: "kyoto", name: "Kyoto" });

  it("returns null when there are no checkins — the trip hasn't started yet", () => {
    expect(currentStopFromCheckins([tokyo, kyoto], [])).toBeNull();
  });

  it("returns the stop with the most recent checkin, by anyone", () => {
    const checkins = [
      makeCheckin({ stop_id: "tokyo", checked_in_at: "2026-09-01T10:00:00Z" }),
      makeCheckin({ stop_id: "kyoto", checked_in_at: "2026-09-04T10:00:00Z", user_id: "user-2" }),
    ];
    expect(currentStopFromCheckins([tokyo, kyoto], checkins)?.id).toBe("kyoto");
  });

  it("uses the latest checkin even if it's from a different user than the first", () => {
    const checkins = [
      makeCheckin({ stop_id: "kyoto", checked_in_at: "2026-09-04T10:00:00Z", user_id: "user-1" }),
      makeCheckin({ stop_id: "tokyo", checked_in_at: "2026-09-01T10:00:00Z", user_id: "user-2" }),
    ];
    expect(currentStopFromCheckins([tokyo, kyoto], checkins)?.id).toBe("kyoto");
  });
});

describe("nextStopAfter", () => {
  const tokyo = makeStop({ id: "tokyo", name: "Tokyo", start_date: "2026-09-01" });
  const kyoto = makeStop({ id: "kyoto", name: "Kyoto", start_date: "2026-09-04" });
  const osaka = makeStop({ id: "osaka", name: "Osaka", start_date: "2026-09-07" });

  it("returns the next stop chronologically", () => {
    expect(nextStopAfter([tokyo, kyoto, osaka], tokyo)?.id).toBe("kyoto");
  });

  it("returns null when the current stop is the last one", () => {
    expect(nextStopAfter([tokyo, kyoto, osaka], osaka)).toBeNull();
  });
});
