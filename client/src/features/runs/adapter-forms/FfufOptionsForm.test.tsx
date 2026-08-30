import { afterEach, describe, expect, it, vi } from "vitest";
import { useState } from "react";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { FfufOptionsForm, ffufOptionsDefault, type FfufOptions } from "./FfufOptionsForm";

function ControlledFfufForm({ onChange }: { onChange: (value: FfufOptions) => void }) {
  const [value, setValue] = useState(ffufOptionsDefault);
  return (
    <FfufOptionsForm
      value={value}
      onChange={(next) => {
        setValue(next);
        onChange(next);
      }}
    />
  );
}

describe("FfufOptionsForm", () => {
  afterEach(() => cleanup());

  it("reports wordlist and match-status-codes edits via onChange", async () => {
    const onChange = vi.fn();
    render(<ControlledFfufForm onChange={onChange} />);
    const user = userEvent.setup();

    await user.selectOptions(screen.getByLabelText("Wordlist"), "common-medium");
    expect(onChange).toHaveBeenLastCalledWith({ ...ffufOptionsDefault, wordlist: "common-medium" });

    await user.clear(screen.getByLabelText("Match status codes"));
    await user.type(screen.getByLabelText("Match status codes"), "200");
    expect(onChange).toHaveBeenLastCalledWith({ ...ffufOptionsDefault, wordlist: "common-medium", matchStatusCodes: "200" });
  });
});
