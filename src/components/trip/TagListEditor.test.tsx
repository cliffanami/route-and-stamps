import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TagListEditor } from "./TagListEditor";

describe("TagListEditor", () => {
  it("renders existing values as tags", () => {
    render(<TagListEditor label="Currencies" values={["JPY", "KES"]} onChange={vi.fn()} />);
    expect(screen.getByText("JPY")).toBeInTheDocument();
    expect(screen.getByText("KES")).toBeInTheDocument();
  });

  it("shows a placeholder message when empty", () => {
    render(<TagListEditor label="Currencies" values={[]} onChange={vi.fn()} />);
    expect(screen.getByText("None yet.")).toBeInTheDocument();
  });

  it("adds a new value on Add click", async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<TagListEditor label="Categories" values={["Food"]} onChange={onChange} />);

    await user.type(screen.getByRole("textbox"), "Culture");
    await user.click(screen.getByRole("button", { name: "Add" }));

    expect(onChange).toHaveBeenCalledWith(["Food", "Culture"]);
  });

  it("adds a new value on Enter", async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<TagListEditor label="Categories" values={[]} onChange={onChange} />);

    await user.type(screen.getByRole("textbox"), "Culture{Enter}");

    expect(onChange).toHaveBeenCalledWith(["Culture"]);
  });

  it("removes a value when its remove button is clicked", async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<TagListEditor label="Categories" values={["Food", "Culture"]} onChange={onChange} />);

    await user.click(screen.getByRole("button", { name: "Remove Food" }));

    expect(onChange).toHaveBeenCalledWith(["Culture"]);
  });

  it("normalizes a value before adding it", async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(
      <TagListEditor
        label="Currencies"
        values={[]}
        onChange={onChange}
        normalize={(v) => v.trim().toUpperCase()}
      />,
    );

    await user.type(screen.getByRole("textbox"), "jpy{Enter}");

    expect(onChange).toHaveBeenCalledWith(["JPY"]);
  });

  it("blocks an add that fails validation and shows the message", async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(
      <TagListEditor
        label="Currencies"
        values={[]}
        onChange={onChange}
        validate={(v) => (v.length === 3 ? null : "Use a 3-letter code")}
      />,
    );

    await user.type(screen.getByRole("textbox"), "YEN2{Enter}");

    expect(onChange).not.toHaveBeenCalled();
    expect(screen.getByText("Use a 3-letter code")).toBeInTheDocument();
  });

  it("doesn't add a duplicate value", async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<TagListEditor label="Currencies" values={["JPY"]} onChange={onChange} />);

    await user.type(screen.getByRole("textbox"), "JPY{Enter}");

    expect(onChange).not.toHaveBeenCalled();
  });
});
