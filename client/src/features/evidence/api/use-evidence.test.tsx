import { afterEach, describe, expect, it, vi } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useEvidence } from "./use-evidence";
import { apiRequestPaginated } from "@/lib/api-client";

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

function wrapper() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

describe("useEvidence", () => {
  afterEach(() => vi.clearAllMocks());

  it("fetches and Zod-parses the project's evidence list", async () => {
    vi.mocked(apiRequestPaginated).mockResolvedValue({ items: [EVIDENCE] });

    const { result } = renderHook(() => useEvidence(PROJECT_ID), { wrapper: wrapper() });

    await waitFor(() => expect(result.current.data).toHaveLength(1));
    expect(apiRequestPaginated).toHaveBeenCalledWith(`/projects/${PROJECT_ID}/evidence`);
  });

  it("scopes the query by nodeId when provided", async () => {
    vi.mocked(apiRequestPaginated).mockResolvedValue({ items: [] });

    renderHook(() => useEvidence(PROJECT_ID, "node-1"), { wrapper: wrapper() });

    await waitFor(() =>
      expect(apiRequestPaginated).toHaveBeenCalledWith(`/projects/${PROJECT_ID}/evidence?nodeId=node-1`),
    );
  });
});
