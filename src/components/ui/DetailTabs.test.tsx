import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { DetailTabs } from "./DetailTabs";

describe("DetailTabs", () => {
  it("shows the first tab's content by default", () => {
    render(
      <DetailTabs
        tabs={[
          { key: "overview", label: "Overview", content: <p>Overview content</p> },
          { key: "tips", label: "Tips", content: <p>Tips content</p> },
        ]}
      />,
    );
    expect(screen.getByText("Overview content")).toBeInTheDocument();
    expect(screen.queryByText("Tips content")).not.toBeInTheDocument();
  });

  it("switches tabs on click", async () => {
    const user = userEvent.setup();
    render(
      <DetailTabs
        tabs={[
          { key: "overview", label: "Overview", content: <p>Overview content</p> },
          { key: "tips", label: "Tips", content: <p>Tips content</p> },
        ]}
      />,
    );

    await user.click(screen.getByRole("radio", { name: "Tips" }));

    expect(screen.getByText("Tips content")).toBeInTheDocument();
    expect(screen.queryByText("Overview content")).not.toBeInTheDocument();
  });

  it("shows no add button for a tab without onAdd", () => {
    render(
      <DetailTabs
        tabs={[{ key: "overview", label: "Overview", content: <p>Content</p> }]}
      />,
    );
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("shows an add button with the given label for a tab with onAdd", () => {
    render(
      <DetailTabs
        tabs={[
          {
            key: "tips",
            label: "Tips",
            content: <p>Content</p>,
            onAdd: vi.fn(),
            addLabel: "Add a tip",
          },
        ]}
      />,
    );
    expect(screen.getByRole("button", { name: "Add a tip" })).toBeInTheDocument();
  });

  it("calls the active tab's onAdd when the add button is clicked", async () => {
    const onAdd = vi.fn();
    const user = userEvent.setup();
    render(
      <DetailTabs
        tabs={[
          { key: "overview", label: "Overview", content: <p>Content</p> },
          {
            key: "tips",
            label: "Tips",
            content: <p>Tips content</p>,
            onAdd,
            addLabel: "Add a tip",
          },
        ]}
      />,
    );

    await user.click(screen.getByRole("radio", { name: "Tips" }));
    await user.click(screen.getByRole("button", { name: "Add a tip" }));

    expect(onAdd).toHaveBeenCalledTimes(1);
  });

  it("respects defaultTab", () => {
    render(
      <DetailTabs
        defaultTab="costs"
        tabs={[
          { key: "overview", label: "Overview", content: <p>Overview content</p> },
          { key: "costs", label: "Costs", content: <p>Costs content</p> },
        ]}
      />,
    );
    expect(screen.getByText("Costs content")).toBeInTheDocument();
  });
});
