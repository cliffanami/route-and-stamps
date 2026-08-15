import { describe, expect, it } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TipCard } from "./TipCard";
import type { Tip } from "@/types/database.types";

function makeTip(overrides: Partial<Tip>): Tip {
  return {
    id: "tip-1",
    trip_id: "trip-1",
    category: "Food",
    format: "text",
    content_text: "Try the ramen near the station.",
    source_url: null,
    embed_html: null,
    related_place_id: null,
    added_by: "user-1",
    created_at: new Date().toISOString(),
    ...overrides,
  };
}

describe("TipCard", () => {
  it("shows the category and text content for a text tip", () => {
    render(<TipCard tip={makeTip({})} />);
    expect(screen.getByText("Food")).toBeInTheDocument();
    expect(
      screen.getByText("Try the ramen near the station."),
    ).toBeInTheDocument();
    expect(screen.queryByText("Video")).not.toBeInTheDocument();
  });

  it("shows a Video badge for a video tip", () => {
    render(
      <TipCard
        tip={makeTip({
          format: "video",
          content_text: null,
          source_url: "https://www.tiktok.com/@user/video/123",
        })}
      />,
    );
    expect(screen.getByText("Video")).toBeInTheDocument();
  });

  it("falls back to a plain link when a video tip has no renderable embed", () => {
    render(
      <TipCard
        tip={makeTip({
          format: "video",
          content_text: null,
          source_url: "https://www.instagram.com/reel/abc123/",
        })}
      />,
    );
    const link = screen.getByRole("link", { name: /View on Instagram/ });
    expect(link).toHaveAttribute(
      "href",
      "https://www.instagram.com/reel/abc123/",
    );
  });

  it("mounts the embed only after the user taps to expand it", async () => {
    const user = userEvent.setup();
    render(
      <TipCard
        tip={makeTip({
          format: "video",
          content_text: null,
          source_url: "https://www.tiktok.com/@user/video/123",
          embed_html: "<blockquote class='tiktok-embed'>post</blockquote>",
        })}
      />,
    );

    expect(
      screen.getByRole("button", { name: "Show TikTok embed" }),
    ).toBeInTheDocument();
    expect(screen.queryByText("post")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Show TikTok embed" }));

    await waitFor(() => expect(screen.getByText("post")).toBeInTheDocument());
  });

  it("shows the related place when given one", () => {
    render(
      <TipCard
        tip={makeTip({ related_place_id: "place-1" })}
        relatedPlaceName="Fushimi Inari Shrine"
      />,
    );
    expect(screen.getByText("Near Fushimi Inari Shrine")).toBeInTheDocument();
  });
});
