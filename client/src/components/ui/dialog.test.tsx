import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Dialog } from "./dialog";

describe("Dialog", () => {
  afterEach(cleanup);

  it("renders as a labeled modal with the given content", () => {
    render(
      <Dialog title="Upload evidence" onClose={vi.fn()}>
        <p>Body content</p>
      </Dialog>,
    );

    expect(screen.getByRole("dialog", { name: "Upload evidence" })).toBeInTheDocument();
    expect(screen.getByText("Body content")).toBeInTheDocument();
  });

  it("closes on Escape", async () => {
    const onClose = vi.fn();
    render(
      <Dialog title="Upload evidence" onClose={onClose}>
        <p>Body content</p>
      </Dialog>,
    );
    const user = userEvent.setup();

    await user.keyboard("{Escape}");

    expect(onClose).toHaveBeenCalled();
  });
});
