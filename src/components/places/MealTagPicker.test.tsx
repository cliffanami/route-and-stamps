import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MealTagPicker } from "./MealTagPicker";

describe("MealTagPicker", () => {
  it("renders all three meal options", () => {
    render(<MealTagPicker value={[]} onChange={vi.fn()} />);
    for (const label of ["Breakfast", "Lunch", "Dinner"]) {
      expect(screen.getByText(label)).toBeInTheDocument();
    }
  });

  it("marks the current value as checked", () => {
    render(<MealTagPicker value={["breakfast", "dinner"]} onChange={vi.fn()} />);
    expect(screen.getByRole("checkbox", { name: "Breakfast" })).toBeChecked();
    expect(screen.getByRole("checkbox", { name: "Lunch" })).not.toBeChecked();
    expect(screen.getByRole("checkbox", { name: "Dinner" })).toBeChecked();
  });

  it("adds a tag when an unchecked option is clicked", async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<MealTagPicker value={["breakfast"]} onChange={onChange} />);

    await user.click(screen.getByRole("checkbox", { name: "Lunch" }));

    expect(onChange).toHaveBeenCalledWith(["breakfast", "lunch"]);
  });

  it("removes a tag when a checked option is clicked", async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<MealTagPicker value={["breakfast", "lunch"]} onChange={onChange} />);

    await user.click(screen.getByRole("checkbox", { name: "Breakfast" }));

    expect(onChange).toHaveBeenCalledWith(["lunch"]);
  });
});
