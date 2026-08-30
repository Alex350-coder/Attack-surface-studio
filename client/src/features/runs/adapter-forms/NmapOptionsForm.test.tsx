import { afterEach, describe, expect, it, vi } from "vitest";
import { useState } from "react";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NmapOptionsForm, nmapOptionsDefault, type NmapOptions } from "./NmapOptionsForm";

/** A controlled input only reflects typed keystrokes if something re-renders it with the new value. */
function ControlledNmapForm({ onChange }: { onChange: (value: NmapOptions) => void }) {
  const [value, setValue] = useState(nmapOptionsDefault);
  return (
    <NmapOptionsForm
      value={value}
      onChange={(next) => {
        setValue(next);
        onChange(next);
      }}
    />
  );
}

describe("NmapOptionsForm", () => {
  afterEach(() => cleanup());

  it("reports port and scan-type edits via onChange", async () => {
    const onChange = vi.fn();
    render(<ControlledNmapForm onChange={onChange} />);
    const user = userEvent.setup();

    await user.type(screen.getByLabelText("Ports (optional)"), "80");
    expect(onChange).toHaveBeenLastCalledWith({ ...nmapOptionsDefault, ports: "80" });

    await user.selectOptions(screen.getByLabelText("Scan type"), "syn");
    expect(onChange).toHaveBeenLastCalledWith({ ...nmapOptionsDefault, ports: "80", scanType: "syn" });
  });

  it("toggles the detect-os checkbox", async () => {
    const onChange = vi.fn();
    render(<NmapOptionsForm value={nmapOptionsDefault} onChange={onChange} />);
    const user = userEvent.setup();

    await user.click(screen.getByLabelText("Detect operating system"));

    expect(onChange).toHaveBeenCalledWith({ ...nmapOptionsDefault, detectOs: true });
  });
});
