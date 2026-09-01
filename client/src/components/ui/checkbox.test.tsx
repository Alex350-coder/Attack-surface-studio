import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Checkbox } from "./checkbox";

describe("Checkbox", () => {
  afterEach(cleanup);

  it("toggles and reports the new checked state", async () => {
    const onChange = vi.fn();
    render(<Checkbox id="detect-os" label="Detect OS" checked={false} onChange={onChange} />);
    const user = userEvent.setup();

    await user.click(screen.getByLabelText("Detect OS"));

    expect(onChange).toHaveBeenCalledWith(true);
  });
});
