import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { PackingMatrix } from "./PackingMatrix";
import type { PackingItem, PackingItemCheck } from "@/types/database.types";
import type { TripMember } from "@/lib/queries/use-trip-members";

const members: TripMember[] = [
  { user_id: "cliff", role: "owner", displayName: "Cliff", joined_at: "" },
  { user_id: "sally", role: "member", displayName: "Sally", joined_at: "" },
];

function makeItem(overrides: Partial<PackingItem>): PackingItem {
  return {
    id: "item-1",
    trip_id: "trip-1",
    name: "Passport",
    category: "Visa & Documents",
    description: null,
    is_document: true,
    is_shared: true,
    is_checked: false,
    due_date: null,
    created_at: "",
    ...overrides,
  };
}

describe("PackingMatrix", () => {
  it("renders item names and category headers", () => {
    render(
      <PackingMatrix
        items={[makeItem({})]}
        checks={[]}
        members={members}
        currentUserId="cliff"
        categories={["Visa & Documents"]}
        onToggleShared={vi.fn()}
        onToggleCheck={vi.fn()}
        onShowDetail={vi.fn()}
      />,
    );
    expect(screen.getByText("Passport")).toBeInTheDocument();
    expect(screen.getByText("Visa & Documents")).toBeInTheDocument();
  });

  it("renders one checkbox for a shared item, reflecting is_checked", () => {
    render(
      <PackingMatrix
        items={[makeItem({ is_shared: true, is_checked: true })]}
        checks={[]}
        members={members}
        currentUserId="cliff"
        categories={["Visa & Documents"]}
        onToggleShared={vi.fn()}
        onToggleCheck={vi.fn()}
        onShowDetail={vi.fn()}
      />,
    );
    expect(screen.getByRole("checkbox", { name: "Passport (shared)" })).toBeChecked();
  });

  it("renders one checkbox per member for a per-person item", () => {
    render(
      <PackingMatrix
        items={[makeItem({ is_shared: false })]}
        checks={[]}
        members={members}
        currentUserId="cliff"
        categories={["Visa & Documents"]}
        onToggleShared={vi.fn()}
        onToggleCheck={vi.fn()}
        onShowDetail={vi.fn()}
      />,
    );
    expect(screen.getByRole("checkbox", { name: "Passport — Cliff" })).toBeInTheDocument();
    expect(screen.getByRole("checkbox", { name: "Passport — Sally" })).toBeInTheDocument();
  });

  it("reflects each member's own check state independently", () => {
    const checks: PackingItemCheck[] = [
      { item_id: "item-1", user_id: "cliff", checked_at: "2026-01-01" },
    ];
    render(
      <PackingMatrix
        items={[makeItem({ is_shared: false })]}
        checks={checks}
        members={members}
        currentUserId="cliff"
        categories={["Visa & Documents"]}
        onToggleShared={vi.fn()}
        onToggleCheck={vi.fn()}
        onShowDetail={vi.fn()}
      />,
    );
    expect(screen.getByRole("checkbox", { name: "Passport — Cliff" })).toBeChecked();
    expect(screen.getByRole("checkbox", { name: "Passport — Sally" })).not.toBeChecked();
  });

  it("disables another member's checkbox — no checking on someone else's behalf", () => {
    render(
      <PackingMatrix
        items={[makeItem({ is_shared: false })]}
        checks={[]}
        members={members}
        currentUserId="cliff"
        categories={["Visa & Documents"]}
        onToggleShared={vi.fn()}
        onToggleCheck={vi.fn()}
        onShowDetail={vi.fn()}
      />,
    );
    expect(screen.getByRole("checkbox", { name: "Passport — Cliff" })).not.toBeDisabled();
    expect(screen.getByRole("checkbox", { name: "Passport — Sally" })).toBeDisabled();
  });

  it("calls onToggleCheck when the current user checks their own box", async () => {
    const onToggleCheck = vi.fn();
    const user = userEvent.setup();
    render(
      <PackingMatrix
        items={[makeItem({ is_shared: false })]}
        checks={[]}
        members={members}
        currentUserId="cliff"
        categories={["Visa & Documents"]}
        onToggleShared={vi.fn()}
        onToggleCheck={onToggleCheck}
        onShowDetail={vi.fn()}
      />,
    );

    await user.click(screen.getByRole("checkbox", { name: "Passport — Cliff" }));

    expect(onToggleCheck).toHaveBeenCalledWith(expect.objectContaining({ id: "item-1" }), true);
  });

  it("calls onToggleShared when the shared checkbox is clicked", async () => {
    const onToggleShared = vi.fn();
    const user = userEvent.setup();
    render(
      <PackingMatrix
        items={[makeItem({ is_shared: true, is_checked: false })]}
        checks={[]}
        members={members}
        currentUserId="cliff"
        categories={["Visa & Documents"]}
        onToggleShared={onToggleShared}
        onToggleCheck={vi.fn()}
        onShowDetail={vi.fn()}
      />,
    );

    await user.click(screen.getByRole("checkbox", { name: "Passport (shared)" }));

    expect(onToggleShared).toHaveBeenCalledWith(expect.objectContaining({ id: "item-1" }), true);
  });

  it("calls onShowDetail when the info button is clicked", async () => {
    const onShowDetail = vi.fn();
    const user = userEvent.setup();
    render(
      <PackingMatrix
        items={[makeItem({})]}
        checks={[]}
        members={members}
        currentUserId="cliff"
        categories={["Visa & Documents"]}
        onToggleShared={vi.fn()}
        onToggleCheck={vi.fn()}
        onShowDetail={onShowDetail}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Details for Passport" }));

    expect(onShowDetail).toHaveBeenCalledWith(expect.objectContaining({ id: "item-1" }));
  });

  it("shows an item's description as secondary text", () => {
    render(
      <PackingMatrix
        items={[makeItem({ description: "Buy at the airport" })]}
        checks={[]}
        members={members}
        currentUserId="cliff"
        categories={["Visa & Documents"]}
        onToggleShared={vi.fn()}
        onToggleCheck={vi.fn()}
        onShowDetail={vi.fn()}
      />,
    );
    expect(screen.getByText("Buy at the airport")).toBeInTheDocument();
  });

  it("orders sections by the configured categories list, appending an unlisted (legacy) category at the end", () => {
    render(
      <PackingMatrix
        items={[
          makeItem({ id: "item-1", name: "Passport", category: "Visa & Documents" }),
          makeItem({ id: "item-2", name: "Old Item", category: "Legacy Bucket" }),
          makeItem({ id: "item-3", name: "Charger", category: "App" }),
        ]}
        checks={[]}
        members={members}
        currentUserId="cliff"
        categories={["App", "Visa & Documents"]}
        onToggleShared={vi.fn()}
        onToggleCheck={vi.fn()}
        onShowDetail={vi.fn()}
      />,
    );
    const headings = screen
      .getAllByRole("button")
      .map((b) => b.textContent)
      .filter((t): t is string => t !== null && ["App", "Visa & Documents", "Legacy Bucket"].includes(t));
    expect(headings).toEqual(["App", "Visa & Documents", "Legacy Bucket"]);
  });

  it("collapses a section's items when its heading is clicked, and expands again on a second click", async () => {
    const user = userEvent.setup();
    render(
      <PackingMatrix
        items={[makeItem({})]}
        checks={[]}
        members={members}
        currentUserId="cliff"
        categories={["Visa & Documents"]}
        onToggleShared={vi.fn()}
        onToggleCheck={vi.fn()}
        onShowDetail={vi.fn()}
      />,
    );

    expect(screen.getByText("Passport")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Collapse Visa & Documents" }));
    expect(screen.queryByText("Passport")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Expand Visa & Documents" }));
    expect(screen.getByText("Passport")).toBeInTheDocument();
  });

  it("renders nothing when there are no items", () => {
    const { container } = render(
      <PackingMatrix
        items={[]}
        checks={[]}
        members={members}
        currentUserId="cliff"
        categories={["Visa & Documents"]}
        onToggleShared={vi.fn()}
        onToggleCheck={vi.fn()}
        onShowDetail={vi.fn()}
      />,
    );
    expect(container).toBeEmptyDOMElement();
  });
});
