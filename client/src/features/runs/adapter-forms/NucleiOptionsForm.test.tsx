import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NucleiOptionsForm, nucleiOptionsDefault } from "./NucleiOptionsForm";

describe("NucleiOptionsForm", () => {
  afterEach(() => cleanup());

  it("adds and removes a tag on checkbox toggle", async () => {
    const onChange = vi.fn();
    render(<NucleiOptionsForm value={nucleiOptionsDefault} onChange={onChange} />);
    const user = userEvent.setup();

    await user.click(screen.getByLabelText("cve"));
    expect(onChange).toHaveBeenLastCalledWith({ ...nucleiOptionsDefault, tags: [...nucleiOptionsDefault.tags, "cve"] });

    await user.click(screen.getByLabelText("exposure"));
    expect(onChange).toHaveBeenLastCalledWith({ ...nucleiOptionsDefault, tags: ["misconfig"] });
  });

  it("reports severity filter changes", async () => {
    const onChange = vi.fn();
    render(<NucleiOptionsForm value={nucleiOptionsDefault} onChange={onChange} />);
    const user = userEvent.setup();

    await user.selectOptions(screen.getByLabelText("Minimum severity (optional)"), "high");

    expect(onChange).toHaveBeenLastCalledWith({ ...nucleiOptionsDefault, severityFilter: "high" });
  });
});
