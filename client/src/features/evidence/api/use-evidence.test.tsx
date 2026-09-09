import { afterEach, describe, expect, it, vi } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { useEvidence } from "./use-evidence";
import { apiRequestPaginated } from "@/lib/api-client";
import { queryClientWrapper } from "@/lib/test/query-client-wrapper";

vi.mock("@/lib/api-client", () => ({ apiRequestPaginated: vi.fn() }));

const PROJECT_ID = "11111111-1111-1111-1111-111111111111";
const EVIDENCE = {
  id: "22222222-2222-2222-2222-222222222222",
  projectId: PROJECT_ID,
  nodeId: null,
  fileRef: "ref-1",
  contentHash: "hash-1",
  mimeType: "image/png",
  label: "Screenshot",
  uploadedBy: "33333333-3333-3333-3333-333333333333",
  createdAt: new Date().toISOString(),
  deletedAt: null,
};

describe("useEvidence", () => {
  afterEach(() => vi.clearAllMocks());

  it("fetches and Zod-parses the project's evidence list, requesting the server's max page size (BUG #12 sibling)", async () => {
    // EvidenceGrid has no pager UI -- without an explicit pageSize, a project with more than
    // DEFAULT_PAGE_SIZE=25 evidence files would silently lose access to the rest, with no indication.
    vi.mocked(apiRequestPaginated).mockResolvedValue({ items: [EVIDENCE] });

    const { result } = renderHook(() => useEvidence(PROJECT_ID), { wrapper: queryClientWrapper() });

    await waitFor(() => expect(result.current.data).toHaveLength(1));
    expect(apiRequestPaginated).toHaveBeenCalledWith(`/projects/${PROJECT_ID}/evidence?pageSize=100`);
  });

  it("scopes the query by nodeId when provided", async () => {
    vi.mocked(apiRequestPaginated).mockResolvedValue({ items: [] });

    renderHook(() => useEvidence(PROJECT_ID, "node-1"), { wrapper: queryClientWrapper() });

    await waitFor(() =>
      expect(apiRequestPaginated).toHaveBeenCalledWith(`/projects/${PROJECT_ID}/evidence?nodeId=node-1&pageSize=100`),
    );
  });
});
