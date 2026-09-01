import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SettingsPage } from "./SettingsPage";

vi.mock("./ScopeEditor", () => ({ ScopeEditor: () => <div>scope-editor</div> }));
vi.mock("./MembersPanel", () => ({ MembersPanel: () => <div>members-panel</div> }));
vi.mock("./ToolConfigPanel", () => ({ ToolConfigPanel: () => <div>tool-config-panel</div> }));

const PROJECT_ID = "11111111-1111-1111-1111-111111111111";

describe("SettingsPage", () => {
  afterEach(() => cleanup());

  it("shows the scope panel by default and switches sections via tabs", async () => {
    const user = userEvent.setup();
    render(<SettingsPage projectId={PROJECT_ID} />);

    expect(screen.getByText("scope-editor")).toBeInTheDocument();
    expect(screen.queryByText("members-panel")).not.toBeInTheDocument();

    await user.click(screen.getByRole("tab", { name: "Members" }));
    expect(screen.getByText("members-panel")).toBeInTheDocument();

    await user.click(screen.getByRole("tab", { name: "Tools" }));
    expect(screen.getByText("tool-config-panel")).toBeInTheDocument();
  });
});
