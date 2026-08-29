import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import type { UseQueryResult } from "@tanstack/react-query";
import { WorkspaceGraphView } from "./WorkspaceGraphView";
import { useProject } from "../api/use-project";
import { useProjectGraph } from "../api/use-project-graph";

vi.mock("../api/use-project", () => ({ useProject: vi.fn() }));
vi.mock("../api/use-project-graph", () => ({ useProjectGraph: vi.fn() }));
vi.mock("@/modules/graph-engine", () => ({
  GraphEngine: ({ data }: { data: { nodes: unknown[] } }) => (
    <div data-testid="graph-engine">{data.nodes.length} nodes</div>
  ),
}));

function queryResult<T>(overrides: Partial<UseQueryResult<T>>): UseQueryResult<T> {
  return {
    isLoading: false,
    isError: false,
    data: undefined,
    error: null,
    ...overrides,
  } as UseQueryResult<T>;
}

const PROJECT_ID = "11111111-1111-1111-1111-111111111111";

describe("WorkspaceGraphView", () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("shows a loading state while the project or graph is loading", () => {
    vi.mocked(useProject).mockReturnValue(queryResult({ isLoading: true }));
    vi.mocked(useProjectGraph).mockReturnValue(queryResult({ isLoading: true }));

    render(<WorkspaceGraphView projectId={PROJECT_ID} />);

    expect(screen.getByText("Loading project…")).toBeInTheDocument();
  });

  it("shows an error message and a link back to the project list on failure", () => {
    vi.mocked(useProject).mockReturnValue(queryResult({}));
    vi.mocked(useProjectGraph).mockReturnValue(
      queryResult({ isError: true, error: new Error("Graph fetch failed") }),
    );

    render(<WorkspaceGraphView projectId={PROJECT_ID} />);

    expect(screen.getByRole("alert")).toHaveTextContent("Graph fetch failed");
    expect(screen.getByRole("link", { name: "Back to projects" })).toHaveAttribute("href", "/app");
  });

  it("shows an empty-graph state distinct from an error", () => {
    vi.mocked(useProject).mockReturnValue(
      queryResult({
        data: {
          id: PROJECT_ID,
          name: "Acme Corp",
          slug: "acme-corp",
          scope: {},
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      }),
    );
    vi.mocked(useProjectGraph).mockReturnValue(queryResult({ data: { nodes: [], edges: [] } }));

    render(<WorkspaceGraphView projectId={PROJECT_ID} />);

    expect(screen.getByText("No discoveries yet. Run a tool against this project to start populating its graph.")).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("renders the graph engine with the adapted data on success", () => {
    vi.mocked(useProject).mockReturnValue(
      queryResult({
        data: {
          id: PROJECT_ID,
          name: "Acme Corp",
          slug: "acme-corp",
          scope: {},
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      }),
    );
    vi.mocked(useProjectGraph).mockReturnValue(
      queryResult({ data: { nodes: [{ id: "n1", type: "host", data: { label: "Node 1" } }], edges: [] } }),
    );

    render(<WorkspaceGraphView projectId={PROJECT_ID} />);

    expect(screen.getByRole("heading", { name: "Acme Corp" })).toBeInTheDocument();
    expect(screen.getByTestId("graph-engine")).toHaveTextContent("1 nodes");
  });
});
