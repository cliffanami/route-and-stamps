import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { TomorrowBanner } from "./TomorrowBanner";
import type { Place, Stop, Todo } from "@/types/database.types";

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

function makeTodo(overrides: Partial<Todo>): Todo {
  return {
    id: overrides.id ?? "todo-1",
    trip_id: "trip-1",
    text: overrides.text ?? "Todo",
    is_done: false,
    due_date: null,
    related_place_id: null,
    phase: null,
    added_by: "user-1",
    created_at: new Date().toISOString(),
    ...overrides,
  };
}

function isoDateOffsetFromToday(days: number) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

describe("TomorrowBanner", () => {
  it("renders nothing when there's nothing tomorrow", () => {
    const { container } = render(
      <TomorrowBanner
        tripId="trip-1"
        places={[makePlace({ date: isoDateOffsetFromToday(2) })]}
        stops={[]}
        todos={[]}
      />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it("lists only places dated tomorrow, not today or later", () => {
    render(
      <TomorrowBanner
        tripId="trip-1"
        places={[
          makePlace({ id: "p1", name: "Today place", date: isoDateOffsetFromToday(0) }),
          makePlace({ id: "p2", name: "Tomorrow place", date: isoDateOffsetFromToday(1) }),
          makePlace({ id: "p3", name: "Later place", date: isoDateOffsetFromToday(3) }),
        ]}
        stops={[]}
        todos={[]}
      />,
    );
    expect(screen.getByText("Tomorrow")).toBeInTheDocument();
    expect(screen.getByText("Tomorrow place")).toBeInTheDocument();
    expect(screen.queryByText("Today place")).not.toBeInTheDocument();
    expect(screen.queryByText("Later place")).not.toBeInTheDocument();
  });

  it("shows an arrival headline when a stop starts tomorrow", () => {
    render(
      <TomorrowBanner
        tripId="trip-1"
        places={[]}
        stops={[makeStop({ id: "stop-1", name: "Kyoto", start_date: isoDateOffsetFromToday(1) })]}
        todos={[]}
      />,
    );
    expect(screen.getByText("Kyoto")).toBeInTheDocument();
    expect(screen.getByText(/Arriving in/)).toBeInTheDocument();
  });

  it("lists only undone todos due tomorrow", () => {
    render(
      <TomorrowBanner
        tripId="trip-1"
        places={[]}
        stops={[]}
        todos={[
          makeTodo({ id: "t1", text: "Forward luggage", due_date: isoDateOffsetFromToday(1) }),
          makeTodo({ id: "t2", text: "Done already", due_date: isoDateOffsetFromToday(1), is_done: true }),
          makeTodo({ id: "t3", text: "Due later", due_date: isoDateOffsetFromToday(3) }),
        ]}
      />,
    );
    expect(screen.getByText(/Forward luggage/)).toBeInTheDocument();
    expect(screen.queryByText(/Done already/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Due later/)).not.toBeInTheDocument();
  });
});
