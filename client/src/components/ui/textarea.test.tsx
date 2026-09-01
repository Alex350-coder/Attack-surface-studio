import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Textarea } from "./textarea";

describe("Textarea", () => {
  afterEach(cleanup);

  it("renders a labeled textarea and reports changes", async () => {
    const onChange = vi.fn();
    render(<Textarea id="question" label="Question" value="" onChange={onChange} />);
    const user = userEvent.setup();

    await user.type(screen.getByLabelText("Question"), "x");

    expect(onChange).toHaveBeenCalledWith("x");
  });

  it("shows an inline error and marks the field invalid", () => {
    render(<Textarea id="question" label="Question" value="" onChange={vi.fn()} error="A question is required." />);

    expect(screen.getByRole("alert")).toHaveTextContent("A question is required.");
    expect(screen.getByLabelText("Question")).toHaveAttribute("aria-invalid", "true");
  });
});
