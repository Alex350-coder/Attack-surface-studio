import { afterEach, describe, expect, it, vi } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useReport } from "./use-report";
import { apiRequest } from "@/lib/api-client";

vi.mock("@/lib/api-client", () => ({ apiRequest: vi.fn() }));

const PROJECT_ID = "11111111-1111-1111-1111-111111111111";
const REPORT_ID = "22222222-2222-2222-2222-222222222222";
const REPORT = {
  id: REPORT_ID,
  projectId: PROJECT_ID,
  title: "Q1 findings",
  status: "draft",
  graphSnapshot: { nodes: [], edges: [] },
  contentRef: null,
  generatedBy: "33333333-3333-3333-3333-333333333333",
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

function wrapper() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

describe("useReport", () => {
  afterEach(() => vi.clearAllMocks());

  it("fetches and Zod-parses a single report", async () => {
    vi.mocked(apiRequest).mockResolvedValue(REPORT);

    const { result } = renderHook(() => useReport(PROJECT_ID, REPORT_ID), { wrapper: wrapper() });

    await waitFor(() => expect(result.current.data?.id).toBe(REPORT_ID));
    expect(apiRequest).toHaveBeenCalledWith(`/projects/${PROJECT_ID}/reports/${REPORT_ID}`);
  });
});
