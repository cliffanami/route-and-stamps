import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { ItineraryView } from "./ItineraryView";
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

describe("ItineraryView", () => {
  it("renders nothing when no place has a date", () => {
    const { container } = render(
      <ItineraryView tripId="trip-1" places={[makePlace({})]} />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it("groups places by date under a heading per day, in chronological order", () => {
    render(
      <ItineraryView
        tripId="trip-1"
        places={[
          makePlace({ id: "p1", name: "Osaka Castle", date: "2026-09-02" }),
          makePlace({ id: "p2", name: "Fushimi Inari", date: "2026-09-01" }),
          makePlace({ id: "p3", name: "Nijo Castle", date: "2026-09-01" }),
        ]}
      />,
    );

    const headings = screen.getAllByRole("heading", { level: 3 });
    expect(headings[0]).toHaveTextContent("Sep 1");
    expect(headings[1]).toHaveTextContent("Sep 2");
    expect(screen.getByText("Fushimi Inari")).toBeInTheDocument();
    expect(screen.getByText("Nijo Castle")).toBeInTheDocument();
    expect(screen.getByText("Osaka Castle")).toBeInTheDocument();
  });

  it("lists undated places under 'Not yet scheduled' once at least one place has a date", () => {
    render(
      <ItineraryView
        tripId="trip-1"
        places={[
          makePlace({ id: "p1", name: "Scheduled place", date: "2026-09-01" }),
          makePlace({ id: "p2", name: "Undated place", date: null }),
        ]}
      />,
    );

    expect(screen.getByText("Not yet scheduled")).toBeInTheDocument();
    expect(screen.getByText("Undated place")).toBeInTheDocument();
  });
});
