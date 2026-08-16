import { describe, expect, it } from "vitest";
import { tipSchema } from "./tip.schema";

function makeTip(overrides: Partial<Parameters<typeof tipSchema.parse>[0]>) {
  return {
    category: "Food",
    format: "text" as const,
    content_text: null,
    source_url: null,
    embed_html: null,
    related_place_id: null,
    related_stop_id: null,
    ...overrides,
  };
}

describe("tipSchema", () => {
  it("accepts a text tip with content", () => {
    const result = tipSchema.safeParse(
      makeTip({ content_text: "Try the ramen." }),
    );
    expect(result.success).toBe(true);
  });

  it("rejects a text tip with no content", () => {
    const result = tipSchema.safeParse(makeTip({ content_text: null }));
    expect(result.success).toBe(false);
  });

  it("accepts a video tip with a link", () => {
    const result = tipSchema.safeParse(
      makeTip({
        format: "video",
        source_url: "https://www.tiktok.com/@user/video/123",
      }),
    );
    expect(result.success).toBe(true);
  });

  it("rejects a video tip with no link", () => {
    const result = tipSchema.safeParse(
      makeTip({ format: "video", source_url: null }),
    );
    expect(result.success).toBe(false);
  });

  it("rejects an empty category", () => {
    const result = tipSchema.safeParse(
      makeTip({ category: "", content_text: "Try the ramen." }),
    );
    expect(result.success).toBe(false);
  });

  it("allows an optional related place", () => {
    const result = tipSchema.safeParse(
      makeTip({
        content_text: "Near the shrine.",
        related_place_id: "11111111-1111-1111-1111-111111111111",
      }),
    );
    expect(result.success).toBe(true);
  });
});
