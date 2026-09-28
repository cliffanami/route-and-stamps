import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { TodayBanner } from "./TodayBanner";
import type { Stop } from "@/types/database.types";

function makeStop(overrides: Partial<Stop>): Stop {
  return {
    id: overrides.id ?? "stop-1",
    trip_id: "trip-1",
    name: overrides.name ?? "Stop",
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
    created_at: new Date().toISOString(),
    ...overrides,
  };
}

function isoDateOffsetFromToday(days: number) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

describe("TodayBanner", () => {
  it("renders nothing when no stop's date range covers today", () => {
    const { container } = render(
      <TodayBanner
        tripId="trip-1"
        stops={[
          makeStop({
            start_date: isoDateOffsetFromToday(1),
            end_date: isoDateOffsetFromToday(3),
          }),
        ]}
      />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it("shows the stop whose date range covers today (multi-day stay)", () => {
    render(
      <TodayBanner
        tripId="trip-1"
        stops={[
          makeStop({
            id: "s1",
            name: "Kyoto",
            start_date: isoDateOffsetFromToday(-2),
            end_date: isoDateOffsetFromToday(1),
          }),
        ]}
      />,
    );
    expect(screen.getByText("Today")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Kyoto" })).toHaveAttribute(
      "href",
      "/trips/trip-1/stops/s1",
    );
  });

  it("shows a single-day stop (no end_date) when it matches today exactly", () => {
    render(
      <TodayBanner
        tripId="trip-1"
        stops={[
          makeStop({
            id: "s1",
            name: "Oasa",
            start_date: isoDateOffsetFromToday(0),
            end_date: null,
          }),
        ]}
      />,
    );
    expect(screen.getByRole("link", { name: "Oasa" })).toBeInTheDocument();
  });

  it("ignores a stop with no start_date", () => {
    const { container } = render(
      <TodayBanner tripId="trip-1" stops={[makeStop({ start_date: null })]} />,
    );
    expect(container).toBeEmptyDOMElement();
  });
});
