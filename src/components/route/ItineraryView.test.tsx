import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { ItineraryView } from "./ItineraryView";
import type { Place, Stop } from "@/types/database.types";

function makePlace(overrides: Partial<Place>): Place {
  return {
    id: overrides.id ?? "place-1",
    trip_id: "trip-1",
    name: overrides.name ?? "Place",
    lat: null,
    lng: null,
    town: null,
    nearest_stop_id: null,
    source_url: null,
    embed_html: null,
    photo_url: null,
    note: null,
    date: null,
    booking_status: "not_booked",
    meal_tags: [],
    is_accommodation: false,
    forward_to_place_id: null,
    forwarding_note: null,
    laundry_note: null,
    needs_name: false,
    added_by: "user-1",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides,
  };
}

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

describe("ItineraryView", () => {
  it("shows an empty state when there are no places at all", () => {
    render(<ItineraryView tripId="trip-1" places={[]} stops={[]} />);
    expect(screen.getByText("No places added yet.")).toBeInTheDocument();
  });

  it("groups dated places under a heading per day, in chronological order, without a redundant 'Day by day' heading", () => {
    render(
      <ItineraryView
        tripId="trip-1"
        places={[
          makePlace({ id: "p1", name: "Osaka Castle", date: "2026-09-02" }),
          makePlace({ id: "p2", name: "Fushimi Inari", date: "2026-09-01" }),
          makePlace({ id: "p3", name: "Nijo Castle", date: "2026-09-01" }),
        ]}
        stops={[]}
      />,
    );

    const headings = screen.getAllByRole("heading", { level: 3 });
    expect(headings[0]).toHaveTextContent("Sep 1");
    expect(headings[1]).toHaveTextContent("Sep 2");
    expect(screen.getByText("Fushimi Inari")).toBeInTheDocument();
    expect(screen.getByText("Nijo Castle")).toBeInTheDocument();
    expect(screen.getByText("Osaka Castle")).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Day by day" })).not.toBeInTheDocument();
  });

  it("lists undated places under 'Not yet scheduled' even when no place has a date", () => {
    render(
      <ItineraryView
        tripId="trip-1"
        places={[makePlace({ id: "p1", name: "Undated place", date: null })]}
        stops={[]}
      />,
    );

    expect(screen.getByText("Not yet scheduled")).toBeInTheDocument();
    expect(screen.getByText("Undated place")).toBeInTheDocument();
  });

  it("lists undated places under 'Not yet scheduled' alongside dated ones", () => {
    render(
      <ItineraryView
        tripId="trip-1"
        places={[
          makePlace({ id: "p1", name: "Scheduled place", date: "2026-09-01" }),
          makePlace({ id: "p2", name: "Undated place", date: null }),
        ]}
        stops={[]}
      />,
    );

    expect(screen.getByText("Not yet scheduled")).toBeInTheDocument();
    expect(screen.getByText("Undated place")).toBeInTheDocument();
  });

  it("shows the place's stop as a secondary link when it's assigned to one", () => {
    render(
      <ItineraryView
        tripId="trip-1"
        places={[
          makePlace({
            id: "p1",
            name: "Fushimi Inari",
            date: "2026-09-01",
            nearest_stop_id: "stop-1",
          }),
        ]}
        stops={[makeStop({ id: "stop-1", name: "Kyoto" })]}
      />,
    );

    const placeLink = screen.getByRole("link", { name: "Fushimi Inari" });
    expect(placeLink).toHaveAttribute("href", "/trips/trip-1/places/p1");
    const stopLink = screen.getByRole("link", { name: "Kyoto" });
    expect(stopLink).toHaveAttribute("href", "/trips/trip-1/stops/stop-1");
  });

  it("omits the secondary stop link when the place isn't assigned to a stop", () => {
    render(
      <ItineraryView
        tripId="trip-1"
        places={[makePlace({ id: "p1", name: "Unassigned Place", date: "2026-09-01" })]}
        stops={[]}
      />,
    );

    expect(screen.getByRole("link", { name: "Unassigned Place" })).toBeInTheDocument();
    expect(screen.queryAllByRole("link")).toHaveLength(1);
  });
});
