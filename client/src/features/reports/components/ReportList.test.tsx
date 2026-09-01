import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import type { UseQueryResult } from "@tanstack/react-query";
import { ReportList } from "./ReportList";
import { useReports } from "../api/use-reports";
import type { Report } from "../api/use-reports";

vi.mock("../api/use-reports", () => ({ useReports: vi.fn() }));

function queryResult(overrides: Partial<UseQueryResult<Report[]>>): UseQueryResult<Report[]> {
  return {
    isLoading: false,
    isError: false,
    data: undefined,
    error: null,
    ...overrides,
  } as UseQueryResult<Report[]>;
}

const PROJECT_ID = "11111111-1111-1111-1111-111111111111";

function makeReport(overrides: Partial<Report> = {}): Report {
  return {
    id: "22222222-2222-2222-2222-222222222222",
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

describe("ReportList", () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("shows a loading state", () => {
    vi.mocked(useReports).mockReturnValue(queryResult({ isLoading: true }));
    render(<ReportList projectId={PROJECT_ID} />);
    expect(screen.getByText("Loading reports…")).toBeInTheDocument();
  });

  it("shows an error state", () => {
    vi.mocked(useReports).mockReturnValue(queryResult({ isError: true, error: new Error("boom") }));
    render(<ReportList projectId={PROJECT_ID} />);
    expect(screen.getByRole("alert")).toHaveTextContent("Failed to load reports.");
  });

  it("shows an empty state", () => {
    vi.mocked(useReports).mockReturnValue(queryResult({ data: [] }));
    render(<ReportList projectId={PROJECT_ID} />);
    expect(screen.getByText("No reports yet. Assemble one above.")).toBeInTheDocument();
  });

  it("renders each report with a link and a status badge", () => {
    vi.mocked(useReports).mockReturnValue(queryResult({ data: [makeReport()] }));
    render(<ReportList projectId={PROJECT_ID} />);
    const link = screen.getByRole("link", { name: "Q1 findings" });
    expect(link).toHaveAttribute("href", `/app/projects/${PROJECT_ID}/reports/22222222-2222-2222-2222-222222222222`);
    expect(screen.getByText("draft")).toBeInTheDocument();
  });
});
