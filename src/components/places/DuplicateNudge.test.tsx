import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { DuplicateNudge } from "./DuplicateNudge";
import type { Place } from "@/types/database.types";

function makePlace(overrides: Partial<Place>): Place {
  return {
    id: "place-1",
    trip_id: "trip-1",
    name: "Place",
    lat: 0,
    lng: 0,
    town: null,
    nearest_stop_id: null,
    source_url: null,
    embed_html: null,
    photo_url: null,
    note: null,
    booking_status: "not_booked",
    meal_tags: [],
    is_accommodation: false,
    needs_name: false,
    visited_at: null,
    added_by: "user-1",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides,
  };
}

describe("DuplicateNudge", () => {
  it("renders nothing when there are no nearby places", () => {
    const { container } = render(<DuplicateNudge places={[]} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("lists nearby places with their town", () => {
    render(
      <DuplicateNudge
        places={[
          makePlace({ id: "a", name: "Fushimi Inari Shrine", town: "Kyoto" }),
          makePlace({ id: "b", name: "Nearby Cafe", town: null }),
        ]}
      />,
    );

    expect(screen.getByText("Might already be added")).toBeInTheDocument();
    expect(screen.getByText("Fushimi Inari Shrine — Kyoto")).toBeInTheDocument();
    expect(screen.getByText("Nearby Cafe")).toBeInTheDocument();
  });
});
