import { describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MediaSlider } from "./MediaSlider";

vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({
    storage: {
      from: () => ({
        createSignedUrl: async () => ({
          data: { signedUrl: "https://example.com/signed.jpg" },
          error: null,
        }),
      }),
    },
  }),
}));

function renderWithQuery(ui: React.ReactElement) {
  const queryClient = new QueryClient();
  return render(
    <QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>,
  );
}

describe("MediaSlider", () => {
  it("renders nothing when there's no photo or link", () => {
    const { container } = renderWithQuery(
      <MediaSlider
        photoPath={null}
        embedHtml={null}
        provider={null}
        sourceUrl={null}
        placeName="Fushimi Inari Shrine"
      />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it("shows the photo, resolved via a signed URL, when only a photo exists", async () => {
    renderWithQuery(
      <MediaSlider
        photoPath="trip-1/place-1/photo.jpg"
        embedHtml={null}
        provider={null}
        sourceUrl={null}
        placeName="Fushimi Inari Shrine"
      />,
    );

    const img = await screen.findByAltText("Fushimi Inari Shrine");
    expect(img).toHaveAttribute("src", "https://example.com/signed.jpg");
    expect(screen.queryByText(/Show .* embed/)).not.toBeInTheDocument();
  });

  it("shows a 'Show embed' placeholder instead of mounting the embed immediately", () => {
    renderWithQuery(
      <MediaSlider
        photoPath={null}
        embedHtml="<blockquote class='instagram-media'>post</blockquote>"
        provider="instagram"
        sourceUrl="https://www.instagram.com/reel/abc123/"
        placeName="Fushimi Inari Shrine"
      />,
    );

    expect(
      screen.getByRole("button", { name: "Show Instagram embed" }),
    ).toBeInTheDocument();
    expect(screen.queryByText("post")).not.toBeInTheDocument();
  });

  it("mounts the embed html only after the user taps to expand it", async () => {
    const user = userEvent.setup();
    renderWithQuery(
      <MediaSlider
        photoPath={null}
        embedHtml="<blockquote class='instagram-media'>post</blockquote>"
        provider="instagram"
        sourceUrl="https://www.instagram.com/reel/abc123/"
        placeName="Fushimi Inari Shrine"
      />,
    );

    await user.click(
      screen.getByRole("button", { name: "Show Instagram embed" }),
    );

    await waitFor(() => expect(screen.getByText("post")).toBeInTheDocument());
  });

  it("falls back to a plain link when a link was saved but has no renderable embed", () => {
    renderWithQuery(
      <MediaSlider
        photoPath={null}
        embedHtml={null}
        provider="instagram"
        sourceUrl="https://www.instagram.com/reel/abc123/"
        placeName="Fushimi Inari Shrine"
      />,
    );

    const link = screen.getByRole("link", { name: /View on Instagram/ });
    expect(link).toHaveAttribute(
      "href",
      "https://www.instagram.com/reel/abc123/",
    );
    expect(link).toHaveAttribute("target", "_blank");
  });

  it("stacks the photo and the link panel — both visible, no swipe required", async () => {
    renderWithQuery(
      <MediaSlider
        photoPath="trip-1/place-1/photo.jpg"
        embedHtml={null}
        provider="tiktok"
        sourceUrl="https://www.tiktok.com/@user/video/123"
        placeName="Fushimi Inari Shrine"
      />,
    );

    await screen.findByAltText("Fushimi Inari Shrine");
    expect(
      screen.getByRole("link", { name: /View on TikTok/ }),
    ).toBeInTheDocument();
  });
});
