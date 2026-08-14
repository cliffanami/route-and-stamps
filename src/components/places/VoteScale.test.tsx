import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { VoteScale } from "./VoteScale";

describe("VoteScale", () => {
  it("renders all five levels", () => {
    render(<VoteScale value={null} onChange={vi.fn()} />);
    for (const label of ["Interested", "Want", "Really want", "Must go", "Skip"]) {
      expect(screen.getByText(label)).toBeInTheDocument();
    }
  });

  it("marks the current value as checked", () => {
    render(<VoteScale value="must_go" onChange={vi.fn()} />);
    expect(screen.getByRole("radio", { name: "Must go" })).toBeChecked();
    expect(screen.getByRole("radio", { name: "Interested" })).not.toBeChecked();
  });

  it("calls onChange with the selected level", async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<VoteScale value={null} onChange={onChange} />);

    await user.click(screen.getByRole("radio", { name: "Skip" }));

    expect(onChange).toHaveBeenCalledWith("skip");
  });

  it("disables all inputs when disabled", () => {
    render(<VoteScale value={null} onChange={vi.fn()} disabled />);
    expect(screen.getByRole("radio", { name: "Want" })).toBeDisabled();
  });
});
