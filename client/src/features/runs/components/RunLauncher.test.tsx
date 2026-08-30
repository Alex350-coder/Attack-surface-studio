import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { RunLauncher } from "./RunLauncher";
import { useTools } from "../api/use-tools";
import { useEnqueueRun } from "../api/use-runs";

vi.mock("../api/use-tools", () => ({ useTools: vi.fn() }));
vi.mock("../api/use-runs", () => ({ useEnqueueRun: vi.fn() }));

const TOOLS = [
  { id: "stub", displayName: "Stub", supportedModes: ["local"] },
  { id: "nmap", displayName: "Nmap", supportedModes: ["local", "docker"] },
];

describe("RunLauncher", () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("shows a loading state while the tool registry loads", () => {
    vi.mocked(useTools).mockReturnValue({ isLoading: true, isError: false, data: undefined } as never);
    vi.mocked(useEnqueueRun).mockReturnValue({ mutate: vi.fn(), isPending: false, isError: false } as never);

    render(<RunLauncher projectId="11111111-1111-1111-1111-111111111111" />);

    expect(screen.getByText("Loading available tools…")).toBeInTheDocument();
  });

  it("shows an error state when the tool registry fails to load", () => {
    vi.mocked(useTools).mockReturnValue({ isLoading: false, isError: true, data: undefined } as never);
    vi.mocked(useEnqueueRun).mockReturnValue({ mutate: vi.fn(), isPending: false, isError: false } as never);

    render(<RunLauncher projectId="11111111-1111-1111-1111-111111111111" />);

    expect(screen.getByRole("alert")).toHaveTextContent("Failed to load the tool registry.");
  });

  it("blocks submission without a target and never calls mutate", async () => {
    const mutate = vi.fn();
    vi.mocked(useTools).mockReturnValue({ isLoading: false, isError: false, data: TOOLS } as never);
    vi.mocked(useEnqueueRun).mockReturnValue({ mutate, isPending: false, isError: false } as never);

    render(<RunLauncher projectId="11111111-1111-1111-1111-111111111111" />);
    const user = userEvent.setup();

    await user.click(screen.getByRole("button", { name: "Start run" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("A target is required.");
    expect(mutate).not.toHaveBeenCalled();
  });

  it("renders the nmap options form when nmap is selected and submits with parsed options", async () => {
    const mutate = vi.fn();
    vi.mocked(useTools).mockReturnValue({ isLoading: false, isError: false, data: TOOLS } as never);
    vi.mocked(useEnqueueRun).mockReturnValue({ mutate, isPending: false, isError: false } as never);

    render(<RunLauncher projectId="11111111-1111-1111-1111-111111111111" />);
    const user = userEvent.setup();

    await user.selectOptions(screen.getByLabelText("Tool"), "nmap");
    expect(screen.getByLabelText("Scan type")).toBeInTheDocument();

    await user.type(screen.getByLabelText("Target"), "example.com");
    await user.click(screen.getByRole("button", { name: "Start run" }));

    expect(mutate).toHaveBeenCalledWith(
      expect.objectContaining({ adapterId: "nmap", target: "example.com", executionMode: "local" }),
    );
  });
});
