import { afterEach, describe, expect, it, vi } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { useReports } from "./use-reports";
import { apiRequestPaginated } from "@/lib/api-client";
import { queryClientWrapper } from "@/lib/test/query-client-wrapper";

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

describe("useReports", () => {
  afterEach(() => vi.clearAllMocks());

  it("fetches and Zod-parses the project's report list, requesting the server's max page size (BUG #12 sibling)", async () => {
    // The reports list has no pager UI -- without an explicit pageSize, a project with more than
    // DEFAULT_PAGE_SIZE=25 reports would silently lose access to the rest, with no indication.
    vi.mocked(apiRequestPaginated).mockResolvedValue({ items: [REPORT] });

    const { result } = renderHook(() => useReports(PROJECT_ID), { wrapper: queryClientWrapper() });

    await waitFor(() => expect(result.current.data).toHaveLength(1));
    expect(apiRequestPaginated).toHaveBeenCalledWith(`/projects/${PROJECT_ID}/reports?pageSize=100`);
  });
});
