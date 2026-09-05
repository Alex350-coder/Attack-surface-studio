import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { UseQueryResult } from "@tanstack/react-query";
import { ReportPreview } from "./ReportPreview";
import { useReport } from "../api/use-report";
import type { Report } from "../api/use-reports";

vi.mock("../api/use-report", () => ({ useReport: vi.fn() }));
vi.mock("@/modules/graph-engine", () => ({
  GraphEngine: ({ data }: { data: { nodes: unknown[] } }) => (
    <div data-testid="graph-engine">{data.nodes.length} nodes</div>
  ),
}));

function renderReportPreview(projectId: string, reportId: string) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <ReportPreview projectId={projectId} reportId={reportId} />
    </QueryClientProvider>,
  );
}

function queryResult(overrides: Partial<UseQueryResult<Report>>): UseQueryResult<Report> {
  return {
    isLoading: false,
    isError: false,
    data: undefined,
    error: null,
    ...overrides,
  } as UseQueryResult<Report>;
}

const PROJECT_ID = "11111111-1111-1111-1111-111111111111";
const REPORT_ID = "22222222-2222-2222-2222-222222222222";

function makeReport(overrides: Partial<Report> = {}): Report {
  return {
    id: REPORT_ID,
    projectId: PROJECT_ID,
    title: "Q1 findings",
    status: "draft",
    graphSnapshot: { nodes: [], edges: [] },
    contentRef: null,
    generatedBy: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

describe("ReportPreview", () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("shows a loading state", () => {
    vi.mocked(useReport).mockReturnValue(queryResult({ isLoading: true }));
    renderReportPreview(PROJECT_ID, REPORT_ID);
    expect(screen.getByText("Loading report…")).toBeInTheDocument();
  });

  it("shows an error state", () => {
    vi.mocked(useReport).mockReturnValue(queryResult({ isError: true, error: new Error("boom") }));
    renderReportPreview(PROJECT_ID, REPORT_ID);
    expect(screen.getByRole("alert")).toHaveTextContent("Failed to load this report.");
  });

  it("shows a not-found state", () => {
    vi.mocked(useReport).mockReturnValue(queryResult({ data: undefined }));
    renderReportPreview(PROJECT_ID, REPORT_ID);
    expect(screen.getByText("Report not found.")).toBeInTheDocument();
  });

  it("renders the title, status badge, and the graph snapshot through GraphEngine", () => {
    vi.mocked(useReport).mockReturnValue(queryResult({ data: makeReport() }));
    renderReportPreview(PROJECT_ID, REPORT_ID);
    expect(screen.getByRole("heading", { name: "Q1 findings" })).toBeInTheDocument();
    expect(screen.getByText("draft")).toBeInTheDocument();
    expect(screen.getByTestId("graph-engine")).toHaveTextContent("0 nodes");
  });
});
