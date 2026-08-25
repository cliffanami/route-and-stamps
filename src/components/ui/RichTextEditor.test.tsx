import { describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { RichTextEditor } from "./RichTextEditor";

// ProseMirror (Tiptap's engine) drives real typing/click interaction through
// browser Range/coordinate APIs (getClientRects, elementFromPoint) that jsdom
// doesn't implement — simulating keystrokes here throws, not asserts. The
// round-trip this milestone cares about (type formatted text, save, reload,
// still formatted) is verified live in a real browser instead; these tests
// cover what jsdom can actually exercise: markdown parses into real
// formatting on mount, and the scoped toolbar renders.
describe("RichTextEditor", () => {
  it("renders the initial markdown value as real formatting, not literal syntax", async () => {
    render(<RichTextEditor value="**Kyoto** notes" onChange={vi.fn()} />);
    await waitFor(() => {
      expect(screen.getByText("Kyoto", { exact: false })).toBeInTheDocument();
    });
    expect(screen.queryByText("**Kyoto**", { exact: false })).not.toBeInTheDocument();
  });

  it("renders a toolbar button for each supported format", async () => {
    render(<RichTextEditor value="" onChange={vi.fn()} />);
    expect(await screen.findByRole("button", { name: "Bold" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Italic" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Bullet list" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Numbered list" })).toBeInTheDocument();
  });

  it("renders an empty editor without crashing when value is empty", async () => {
    render(<RichTextEditor value="" onChange={vi.fn()} />);
    expect(await screen.findByRole("textbox")).toBeInTheDocument();
  });
});
