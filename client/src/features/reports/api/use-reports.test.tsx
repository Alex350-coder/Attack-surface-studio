import { afterEach, describe, expect, it, vi } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useReports } from "./use-reports";
import { apiRequestPaginated } from "@/lib/api-client";

vi.mock("@/lib/api-client", () => ({ apiRequestPaginated: vi.fn() }));

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

describe("useReports", () => {
  afterEach(() => vi.clearAllMocks());

  it("fetches and Zod-parses the project's report list", async () => {
    vi.mocked(apiRequestPaginated).mockResolvedValue({ items: [REPORT] });

    const { result } = renderHook(() => useReports(PROJECT_ID), { wrapper: wrapper() });

    await waitFor(() => expect(result.current.data).toHaveLength(1));
    expect(apiRequestPaginated).toHaveBeenCalledWith(`/projects/${PROJECT_ID}/reports`);
  });
});
