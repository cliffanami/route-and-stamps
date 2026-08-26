import { describe, expect, it } from "vitest";
import { tipSchema } from "./tip.schema";

function makeTip(overrides: Partial<Parameters<typeof tipSchema.parse>[0]>) {
  return {
    category: "Food",
    format: "text" as const,
    title: null,
    content_text: null,
    source_url: null,
    embed_html: null,
    video_caption: null,
    tags: [],
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

  it("allows an optional title on either format", () => {
    const result = tipSchema.safeParse(
      makeTip({ content_text: "Try the ramen.", title: "Ramen tip" }),
    );
    expect(result.success).toBe(true);
  });

  it("allows a tip with no title", () => {
    const result = tipSchema.safeParse(
      makeTip({ content_text: "Try the ramen.", title: null }),
    );
    expect(result.success).toBe(true);
  });

  it("allows a video tip to carry an optional caption", () => {
    const result = tipSchema.safeParse(
      makeTip({
        format: "video",
        source_url: "https://www.tiktok.com/@user/video/123",
        video_caption: "Great walkthrough of the night market.",
      }),
    );
    expect(result.success).toBe(true);
  });

  it("allows a tip with no caption", () => {
    const result = tipSchema.safeParse(
      makeTip({ content_text: "Try the ramen.", video_caption: null }),
    );
    expect(result.success).toBe(true);
  });

  it("accepts a tip with multiple tags", () => {
    const result = tipSchema.safeParse(
      makeTip({
        content_text: "Try the ramen.",
        tags: ["rainy-day", "budget"],
      }),
    );
    expect(result.success).toBe(true);
  });

  it("defaults tags to an empty array when omitted", () => {
    const withoutTags: Record<string, unknown> = makeTip({
      content_text: "Try the ramen.",
    });
    delete withoutTags.tags;
    const result = tipSchema.parse(withoutTags);
    expect(result.tags).toEqual([]);
  });

  it("rejects an empty-string tag", () => {
    const result = tipSchema.safeParse(
      makeTip({ content_text: "Try the ramen.", tags: [""] }),
    );
    expect(result.success).toBe(false);
  });

  it("rejects more than 10 tags", () => {
    const result = tipSchema.safeParse(
      makeTip({
        content_text: "Try the ramen.",
        tags: Array.from({ length: 11 }, (_, i) => `tag-${i}`),
      }),
    );
    expect(result.success).toBe(false);
  });
});
