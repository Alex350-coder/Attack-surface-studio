import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { UseQueryResult } from "@tanstack/react-query";
import { ReportBuilder } from "./ReportBuilder";
import { useProjectGraph } from "@/features/workspace/api/use-project-graph";
import { useCreateReport } from "../api/use-create-report";
import type { GraphModel } from "@/modules/graph-engine";
import type { NodeModel } from "@/modules/graph-engine/types/node.types";

type CreateReportMutation = ReturnType<typeof useCreateReport>;

vi.mock("@/features/workspace/api/use-project-graph", () => ({ useProjectGraph: vi.fn() }));
vi.mock("../api/use-create-report", () => ({ useCreateReport: vi.fn() }));

const NODE_1: NodeModel = { id: "node-1", type: "host", data: { label: "10.0.0.1" } } as NodeModel;

vi.mock("@/modules/graph-engine", () => ({
  GraphEngine: ({ onNodeSelect }: { onNodeSelect?: (node: NodeModel) => void }) => (
    <button type="button" onClick={() => onNodeSelect?.(NODE_1)}>
      select-node
    </button>
  ),
}));

function graphQueryResult(overrides: Partial<UseQueryResult<GraphModel>>): UseQueryResult<GraphModel> {
  return {
    isLoading: false,
    isError: false,
    data: undefined,
    error: null,
    ...overrides,
  } as UseQueryResult<GraphModel>;
}

function mutationResult(overrides: Partial<CreateReportMutation>): CreateReportMutation {
  return {
    mutate: vi.fn(),
    isPending: false,
    isError: false,
    error: null,
    data: undefined,
    ...overrides,
  } as CreateReportMutation;
}

const PROJECT_ID = "11111111-1111-1111-1111-111111111111";

describe("ReportBuilder", () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("shows a loading state while the graph loads", () => {
    vi.mocked(useProjectGraph).mockReturnValue(graphQueryResult({ isLoading: true }));
    vi.mocked(useCreateReport).mockReturnValue(mutationResult({}));

    render(<ReportBuilder projectId={PROJECT_ID} />);

    expect(screen.getByText("Loading graph…")).toBeInTheDocument();
  });

  it("shows an error state when the graph fails to load", () => {
    vi.mocked(useProjectGraph).mockReturnValue(graphQueryResult({ isError: true }));
    vi.mocked(useCreateReport).mockReturnValue(mutationResult({}));

    render(<ReportBuilder projectId={PROJECT_ID} />);

    expect(screen.getByRole("alert")).toHaveTextContent("Failed to load the project graph.");
  });

  it("accumulates node selections from the graph and submits them on assemble", async () => {
    const user = userEvent.setup();
    const mutate = vi.fn();
    vi.mocked(useProjectGraph).mockReturnValue(graphQueryResult({ data: { nodes: [], edges: [] } }));
    vi.mocked(useCreateReport).mockReturnValue(mutationResult({ mutate }));

    render(<ReportBuilder projectId={PROJECT_ID} />);

    await user.type(screen.getByLabelText("Report title"), "Q1 findings");
    await user.click(screen.getByText("select-node"));

    expect(screen.getByText("Click nodes in the graph to add them (1 selected)")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Assemble report" }));

    expect(mutate).toHaveBeenCalledWith(
      { title: "Q1 findings", nodeIds: ["node-1"], edgeIds: [] },
      expect.objectContaining({ onSuccess: expect.any(Function) }),
    );
  });

  it("rejects submission without a title or a selected node", async () => {
    const user = userEvent.setup();
    const mutate = vi.fn();
    vi.mocked(useProjectGraph).mockReturnValue(graphQueryResult({ data: { nodes: [], edges: [] } }));
    vi.mocked(useCreateReport).mockReturnValue(mutationResult({ mutate }));

    render(<ReportBuilder projectId={PROJECT_ID} />);

    await user.click(screen.getByRole("button", { name: "Assemble report" }));

    expect(screen.getByRole("alert")).toHaveTextContent("A title is required.");
    expect(mutate).not.toHaveBeenCalled();
  });

  it("removes a selected node when its remove button is clicked", async () => {
    const user = userEvent.setup();
    vi.mocked(useProjectGraph).mockReturnValue(graphQueryResult({ data: { nodes: [], edges: [] } }));
    vi.mocked(useCreateReport).mockReturnValue(mutationResult({}));

    render(<ReportBuilder projectId={PROJECT_ID} />);

    await user.click(screen.getByText("select-node"));
    expect(screen.getByText("Click nodes in the graph to add them (1 selected)")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Remove 10.0.0.1" }));
    expect(screen.getByText("Click nodes in the graph to add them (0 selected)")).toBeInTheDocument();
  });
});
