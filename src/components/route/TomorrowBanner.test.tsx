import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { TomorrowBanner } from "./TomorrowBanner";
import type { Place } from "@/types/database.types";

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
    needs_name: false,
    added_by: "user-1",
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

describe("TomorrowBanner", () => {
  it("renders nothing when no place is dated tomorrow", () => {
    const { container } = render(
      <TomorrowBanner
        tripId="trip-1"
        places={[makePlace({ date: isoDateOffsetFromToday(2) })]}
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
      />,
    );
    expect(screen.getByText("Tomorrow")).toBeInTheDocument();
    expect(screen.getByText("Tomorrow place")).toBeInTheDocument();
    expect(screen.queryByText("Today place")).not.toBeInTheDocument();
    expect(screen.queryByText("Later place")).not.toBeInTheDocument();
  });
});
