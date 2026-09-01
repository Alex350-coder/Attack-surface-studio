import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { UseMutationResult, UseQueryResult } from "@tanstack/react-query";
import { ToolConfigPanel } from "./ToolConfigPanel";
import { useTools, type ToolListing } from "@/features/runs/api/use-tools";
import { useDetectTool, useSetToolConfig, useToolConfig, type DetectionResult, type ToolConfig } from "../api/use-tool-config";

vi.mock("@/features/runs/api/use-tools", () => ({ useTools: vi.fn() }));
vi.mock("../api/use-tool-config", () => ({
  useToolConfig: vi.fn(),
  useSetToolConfig: vi.fn(),
  useDetectTool: vi.fn(),
}));

type DetectMutation = ReturnType<typeof useDetectTool>;
type SetConfigMutation = ReturnType<typeof useSetToolConfig>;

function toolsQueryResult(overrides: Partial<UseQueryResult<ToolListing[]>>): UseQueryResult<ToolListing[]> {
  return {
    isLoading: false,
    isError: false,
    data: undefined,
    error: null,
    ...overrides,
  } as UseQueryResult<ToolListing[]>;
}

function configQueryResult(overrides: Partial<UseQueryResult<ToolConfig | null>>): UseQueryResult<ToolConfig | null> {
  return {
    isLoading: false,
    isError: false,
    data: undefined,
    error: null,
    ...overrides,
  } as UseQueryResult<ToolConfig | null>;
}

function detectMutationResult(overrides: Partial<DetectMutation>): DetectMutation {
  return {
    mutate: vi.fn(),
    isPending: false,
    isError: false,
    error: null,
    data: undefined,
    ...overrides,
  } as DetectMutation;
}

function setConfigMutationResult(overrides: Partial<SetConfigMutation>): SetConfigMutation {
  return {
    mutate: vi.fn(),
    isPending: false,
    isError: false,
    error: null,
    data: undefined,
    ...overrides,
  } as SetConfigMutation;
}

const PROJECT_ID = "11111111-1111-1111-1111-111111111111";

describe("ToolConfigPanel", () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("shows a loading state", () => {
    vi.mocked(useTools).mockReturnValue(toolsQueryResult({ isLoading: true }));
    render(<ToolConfigPanel projectId={PROJECT_ID} />);
    expect(screen.getByText("Loading tools…")).toBeInTheDocument();
  });

  it("shows an error state", () => {
    vi.mocked(useTools).mockReturnValue(toolsQueryResult({ isError: true }));
    render(<ToolConfigPanel projectId={PROJECT_ID} />);
    expect(screen.getByRole("alert")).toHaveTextContent("Failed to load the tool registry.");
  });

  it("shows an empty state", () => {
    vi.mocked(useTools).mockReturnValue(toolsQueryResult({ data: [] }));
    render(<ToolConfigPanel projectId={PROJECT_ID} />);
    expect(screen.getByText("No tools registered.")).toBeInTheDocument();
  });

  it("renders each tool with a detect button and lets the user trigger detection and save config", async () => {
    const user = userEvent.setup();
    const detectMutate = vi.fn();
    const setConfigMutate = vi.fn();
    vi.mocked(useTools).mockReturnValue(
      toolsQueryResult({ data: [{ id: "nmap", displayName: "Nmap", supportedModes: ["local", "docker"] }] }),
    );
    vi.mocked(useToolConfig).mockReturnValue(configQueryResult({ data: null }));
    vi.mocked(useDetectTool).mockReturnValue(detectMutationResult({ mutate: detectMutate }));
    vi.mocked(useSetToolConfig).mockReturnValue(setConfigMutationResult({ mutate: setConfigMutate }));

    render(<ToolConfigPanel projectId={PROJECT_ID} />);

    expect(screen.getByText("Nmap")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Detect" }));
    expect(detectMutate).toHaveBeenCalledWith("local");

    await user.click(screen.getByRole("button", { name: "Save" }));
    expect(setConfigMutate).toHaveBeenCalledWith({ executionMode: "local", config: {} });
  });

  it("reflects a saved execution mode once the config query resolves, instead of staying on the initial default", () => {
    vi.mocked(useTools).mockReturnValue(
      toolsQueryResult({ data: [{ id: "nmap", displayName: "Nmap", supportedModes: ["local", "docker"] }] }),
    );
    vi.mocked(useDetectTool).mockReturnValue(detectMutationResult({}));
    vi.mocked(useSetToolConfig).mockReturnValue(setConfigMutationResult({}));

    // First render: the config query hasn't resolved yet (undefined data).
    vi.mocked(useToolConfig).mockReturnValue(configQueryResult({ isLoading: true, data: undefined }));
    const { rerender } = render(<ToolConfigPanel projectId={PROJECT_ID} />);
    expect(screen.getByLabelText("Execution mode")).toHaveValue("local");

    // Second render: the query resolves with a previously-saved "docker" config -- the select
    // must pick that up rather than staying frozen on the "local" default from mount.
    vi.mocked(useToolConfig).mockReturnValue(
      configQueryResult({ data: { executionMode: "docker", config: {} } as ToolConfig }),
    );
    rerender(<ToolConfigPanel projectId={PROJECT_ID} />);
    expect(screen.getByLabelText("Execution mode")).toHaveValue("docker");
  });

  it("shows the detection result as a badge", () => {
    vi.mocked(useTools).mockReturnValue(
      toolsQueryResult({ data: [{ id: "nmap", displayName: "Nmap", supportedModes: ["local"] }] }),
    );
    vi.mocked(useToolConfig).mockReturnValue(configQueryResult({ data: null }));
    vi.mocked(useDetectTool).mockReturnValue(
      detectMutationResult({ data: { available: true, version: "7.94" } as DetectionResult }),
    );
    vi.mocked(useSetToolConfig).mockReturnValue(setConfigMutationResult({}));

    render(<ToolConfigPanel projectId={PROJECT_ID} />);

    expect(screen.getByText("Available (7.94)")).toBeInTheDocument();
  });
});
