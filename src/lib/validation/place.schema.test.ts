import { describe, expect, it } from "vitest";
import { placeSchema } from "./place.schema";

function makePlace(overrides: Partial<Parameters<typeof placeSchema.parse>[0]>) {
  return {
    name: "Kiyomizu An",
    source_url: null,
    note: null,
    date: null,
    lat: null,
    lng: null,
    town: null,
    nearest_stop_id: null,
    meal_tags: [],
    is_accommodation: true,
    forward_to_place_id: null,
    forwarding_note: null,
    laundry_note: null,
    ...overrides,
  };
}

// Only the fields added in ROADMAP.md Milestone AA — the rest of
// placeSchema predates this file and isn't retroactively covered here.
describe("placeSchema — luggage forwarding & laundry", () => {
  it("accepts a place with no forwarding or laundry info", () => {
    expect(placeSchema.safeParse(makePlace({})).success).toBe(true);
  });

  it("accepts a place with a forwarding destination and note", () => {
    const result = placeSchema.safeParse(
      makePlace({
        forward_to_place_id: "11111111-1111-1111-1111-111111111111",
        forwarding_note: "Yamato counter near Kyoto Station, pay with Suica",
      }),
    );
    expect(result.success).toBe(true);
  });

  it("rejects a non-UUID forward_to_place_id", () => {
    const result = placeSchema.safeParse(makePlace({ forward_to_place_id: "not-a-uuid" }));
    expect(result.success).toBe(false);
  });

  it("accepts an independent laundry note with no forwarding set", () => {
    const result = placeSchema.safeParse(
      makePlace({ laundry_note: "Washer/dryer available on-site" }),
    );
    expect(result.success).toBe(true);
  });
});
