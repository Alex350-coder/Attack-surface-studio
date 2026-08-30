import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TextField } from "./text-field";

describe("TextField", () => {
  afterEach(cleanup);

  it("renders a labeled input and reports changes", async () => {
    const onChange = vi.fn();
    render(<TextField id="title" label="Title" value="" onChange={onChange} />);
    const user = userEvent.setup();

    await user.type(screen.getByLabelText("Title"), "x");

    expect(onChange).toHaveBeenCalledWith("x");
  });

  it("shows an inline error and marks the input invalid", () => {
    render(<TextField id="title" label="Title" value="" onChange={vi.fn()} error="Title is required." />);

    expect(screen.getByRole("alert")).toHaveTextContent("Title is required.");
    expect(screen.getByLabelText("Title")).toHaveAttribute("aria-invalid", "true");
  });
});
