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
        onToggleShared={vi.fn()}
        onToggleCheck={vi.fn()}
        onShowDetail={onShowDetail}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Details for Passport" }));

    expect(onShowDetail).toHaveBeenCalledWith(expect.objectContaining({ id: "item-1" }));
  });

  it("renders nothing when there are no items", () => {
    const { container } = render(
      <PackingMatrix
        items={[]}
        checks={[]}
        members={members}
        currentUserId="cliff"
        onToggleShared={vi.fn()}
        onToggleCheck={vi.fn()}
        onShowDetail={vi.fn()}
      />,
    );
    expect(container).toBeEmptyDOMElement();
  });
});
