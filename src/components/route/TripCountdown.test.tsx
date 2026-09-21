import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { TripCountdown } from "./TripCountdown";
import type { Trip } from "@/types/database.types";

function makeTrip(overrides: Partial<Trip>): Trip {
  return {
    id: "trip-1",
    name: "Trip",
    description: null,
    start_date: null,
    end_date: null,
    is_international: false,
    luggage_forwarding_enabled: false,
    budget_mode: "tally",
    budget_cap: null,
    budget_cap_currency: null,
    currencies: [],
    tip_categories: [],
    budget_categories: [],
    packing_categories: [],
    outbound_travel_note: null,
    return_travel_note: null,
    transport_modes: [],
    created_by: "user-1",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides,
  };
}

function isoDateOffsetFromToday(days: number) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

describe("TripCountdown", () => {
  it("renders nothing when the trip has no start date", () => {
    const { container } = render(<TripCountdown trip={makeTrip({ start_date: null })} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("shows a countdown before the trip starts", () => {
    render(<TripCountdown trip={makeTrip({ start_date: isoDateOffsetFromToday(5) })} />);
    expect(screen.getByText("5 days until your trip")).toBeInTheDocument();
  });

  it("uses singular 'day' for exactly 1 day out", () => {
    render(<TripCountdown trip={makeTrip({ start_date: isoDateOffsetFromToday(1) })} />);
    expect(screen.getByText("1 day until your trip")).toBeInTheDocument();
  });

  it("shows 'Day N of your trip' once the trip has started", () => {
    render(
      <TripCountdown
        trip={makeTrip({
          start_date: isoDateOffsetFromToday(-2),
          end_date: isoDateOffsetFromToday(3),
        })}
      />,
    );
    expect(screen.getByText("Day 3 of your trip")).toBeInTheDocument();
  });

  it("shows Day 1 on the trip's start date itself", () => {
    render(
      <TripCountdown
        trip={makeTrip({
          start_date: isoDateOffsetFromToday(0),
          end_date: isoDateOffsetFromToday(2),
        })}
      />,
    );
    expect(screen.getByText("Day 1 of your trip")).toBeInTheDocument();
  });

  it("renders nothing after the trip has ended", () => {
    const { container } = render(
      <TripCountdown
        trip={makeTrip({
          start_date: isoDateOffsetFromToday(-10),
          end_date: isoDateOffsetFromToday(-1),
        })}
      />,
    );
    expect(container).toBeEmptyDOMElement();
  });
});
