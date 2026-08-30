import { afterEach, describe, expect, it, vi } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useCreateReport } from "./use-create-report";
import { apiRequest } from "@/lib/api-client";

vi.mock("@/lib/api-client", () => ({ apiRequest: vi.fn() }));

const PROJECT_ID = "11111111-1111-1111-1111-111111111111";
const REPORT = {
  id: "22222222-2222-2222-2222-222222222222",
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

describe("useCreateReport", () => {
  afterEach(() => vi.clearAllMocks());

  it("posts the selected node/edge ids and Zod-parses the created report", async () => {
    vi.mocked(apiRequest).mockResolvedValue(REPORT);

    const { result } = renderHook(() => useCreateReport(PROJECT_ID), { wrapper: wrapper() });

    result.current.mutate({ title: "Q1 findings", nodeIds: ["node-1"], edgeIds: [] });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(apiRequest).toHaveBeenCalledWith(`/projects/${PROJECT_ID}/reports`, {
      method: "POST",
      body: { title: "Q1 findings", nodeIds: ["node-1"], edgeIds: [] },
    });
    expect(result.current.data?.id).toBe(REPORT.id);
  });
});
