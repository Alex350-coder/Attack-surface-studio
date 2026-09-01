import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import type { UseQueryResult } from "@tanstack/react-query";
import { TimelineView } from "./TimelineView";
import { useProjectGraphRaw } from "@/features/workspace/api/use-project-graph";
import type { Node, Edge } from "@/lib/server-contracts";

vi.mock("@/features/workspace/api/use-project-graph", () => ({ useProjectGraphRaw: vi.fn() }));
vi.mock("@/modules/graph-engine", () => ({
  GraphEngine: ({ data, timeline }: { data: { nodes: unknown[] }; timeline?: unknown[] }) => (
    <div data-testid="graph-engine">
      {data.nodes.length} nodes, {timeline?.length ?? 0} steps
    </div>
  ),
}));

type GraphData = { nodes: Node[]; edges: Edge[] };

function queryResult(overrides: Partial<UseQueryResult<GraphData>>): UseQueryResult<GraphData> {
  return {
    isLoading: false,
    isError: false,
    data: undefined,
    error: null,
    ...overrides,
  } as UseQueryResult<GraphData>;
}

const PROJECT_ID = "11111111-1111-1111-1111-111111111111";

function makeNode(overrides: Partial<Node> = {}): Node {
  return {
    id: "11111111-1111-1111-1111-111111111111",
    projectId: PROJECT_ID,
    identityKey: "example.com",
    type: "domain",
    category: "infrastructure",
    label: "example.com",
    severity: null,
    data: {},
    sourceRunId: null,
    createdBy: null,
    createdAt: new Date("2026-01-01T00:00:00Z"),
    updatedAt: new Date("2026-01-01T00:00:00Z"),
    lastSeenAt: new Date("2026-01-01T00:00:00Z"),
    ...overrides,
  };
}

describe("TimelineView", () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("shows a loading state", () => {
    vi.mocked(useProjectGraphRaw).mockReturnValue(queryResult({ isLoading: true }));
    render(<TimelineView projectId={PROJECT_ID} />);
    expect(screen.getByText("Loading timeline…")).toBeInTheDocument();
  });

  it("shows an error state", () => {
    vi.mocked(useProjectGraphRaw).mockReturnValue(queryResult({ isError: true }));
    render(<TimelineView projectId={PROJECT_ID} />);
    expect(screen.getByRole("alert")).toHaveTextContent("Failed to load the project graph.");
  });

  it("shows an empty-graph state", () => {
    vi.mocked(useProjectGraphRaw).mockReturnValue(queryResult({ data: { nodes: [], edges: [] } }));
    render(<TimelineView projectId={PROJECT_ID} />);
    expect(screen.getByText(/No discoveries yet/)).toBeInTheDocument();
  });

  it("renders the replay through GraphEngine and the accessible event list", () => {
    vi.mocked(useProjectGraphRaw).mockReturnValue(
      queryResult({ data: { nodes: [makeNode()], edges: [] } }),
    );

    render(<TimelineView projectId={PROJECT_ID} />);

    expect(screen.getByTestId("graph-engine")).toHaveTextContent("1 nodes, 1 steps");
    expect(screen.getByText("example.com discovered")).toBeInTheDocument();
  });
});
