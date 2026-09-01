import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Select } from "./select";

describe("Select", () => {
  afterEach(cleanup);

  it("renders every option and reports the selected value", async () => {
    const onChange = vi.fn();
    render(
      <Select
        id="mode"
        label="Execution mode"
        value="local"
        onChange={onChange}
        options={[
          { value: "local", label: "Local" },
          { value: "docker", label: "Docker" },
        ]}
      />,
    );
    const user = userEvent.setup();

    await user.selectOptions(screen.getByLabelText("Execution mode"), "docker");

    expect(onChange).toHaveBeenCalledWith("docker");
  });
});
