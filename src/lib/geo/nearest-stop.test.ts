import { describe, expect, it } from "vitest";
import { nearestStop } from "./nearest-stop";
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
    hotel_info: null,
    meals_info: null,
    guide_info: null,
    flight_info: null,
    created_at: new Date().toISOString(),
    ...overrides,
  };
}

describe("nearestStop", () => {
  it("returns null when there are no stops", () => {
    expect(nearestStop(35.6812, 139.7671, [])).toBeNull();
  });

  it("returns the single stop when there's only one", () => {
    const tokyo = makeStop({ id: "tokyo", lat: 35.6812, lng: 139.7671 });
    expect(nearestStop(35.7, 139.75, [tokyo])?.id).toBe("tokyo");
  });

  it("picks the closer of two stops", () => {
    const tokyo = makeStop({ id: "tokyo", lat: 35.6812, lng: 139.7671 });
    const kyoto = makeStop({ id: "kyoto", lat: 35.0116, lng: 135.7681 });

    // A point right next to Tokyo should assign to Tokyo, not Kyoto.
    expect(nearestStop(35.69, 139.77, [tokyo, kyoto])?.id).toBe("tokyo");
    // A point right next to Kyoto should assign to Kyoto.
    expect(nearestStop(35.01, 135.77, [tokyo, kyoto])?.id).toBe("kyoto");
  });
});
