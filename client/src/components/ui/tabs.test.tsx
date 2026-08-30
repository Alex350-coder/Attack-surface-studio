import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Tabs } from "./tabs";

function ControlledTabs({ onChange }: { onChange: (value: string) => void }) {
  return (
    <Tabs value="runs" onChange={onChange}>
      <Tabs.List>
        <Tabs.Trigger value="runs">Runs</Tabs.Trigger>
        <Tabs.Trigger value="members">Members</Tabs.Trigger>
      </Tabs.List>
      <Tabs.Panel value="runs">Runs panel</Tabs.Panel>
      <Tabs.Panel value="members">Members panel</Tabs.Panel>
    </Tabs>
  );
}

describe("Tabs", () => {
  afterEach(cleanup);

  it("shows only the active panel and marks the active trigger selected", () => {
    render(<ControlledTabs onChange={vi.fn()} />);

    expect(screen.getByText("Runs panel")).toBeInTheDocument();
    expect(screen.queryByText("Members panel")).not.toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Runs" })).toHaveAttribute("aria-selected", "true");
  });

  it("calls onChange with the clicked tab's value", async () => {
    const onChange = vi.fn();
    render(<ControlledTabs onChange={onChange} />);
    const user = userEvent.setup();

    await user.click(screen.getByRole("tab", { name: "Members" }));

    expect(onChange).toHaveBeenCalledWith("members");
  });

  it("throws when a Tabs.Trigger is rendered outside Tabs", () => {
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(() => render(<Tabs.Trigger value="x">X</Tabs.Trigger>)).toThrow();
    consoleErrorSpy.mockRestore();
  });
});
