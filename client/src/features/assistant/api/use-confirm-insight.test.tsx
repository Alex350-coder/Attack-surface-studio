import { afterEach, describe, expect, it, vi } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useConfirmInsight } from "./use-confirm-insight";
import { apiRequest } from "@/lib/api-client";

vi.mock("@/lib/api-client", () => ({ apiRequest: vi.fn() }));

const PROJECT_ID = "11111111-1111-1111-1111-111111111111";
const NODE_ID = "22222222-2222-2222-2222-222222222222";
const INSIGHT_NODE_ID = "33333333-3333-3333-3333-333333333333";

const INSIGHT_RESULT = {
  node: {
    id: INSIGHT_NODE_ID,
    projectId: PROJECT_ID,
    identityKey: "aiInsight:abc123",
    type: "aiInsight",
    category: "intelligence",
    label: "example.com has not been scanned recently",
    severity: null,
    data: {},
    sourceRunId: null,
    createdBy: "44444444-4444-4444-4444-444444444444",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    lastSeenAt: new Date().toISOString(),
  },
  edges: [
    {
      id: "55555555-5555-5555-5555-555555555555",
      projectId: PROJECT_ID,
      sourceId: INSIGHT_NODE_ID,
      targetId: NODE_ID,
      type: "ai",
      animated: true,
      label: null,
      data: {},
      sourceRunId: null,
      createdAt: new Date().toISOString(),
    },
  ],
};

function wrapper() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

describe("useConfirmInsight", () => {
  afterEach(() => vi.clearAllMocks());

  it("posts the insight content and related node ids, Zod-parsing the written node and edges", async () => {
    vi.mocked(apiRequest).mockResolvedValue(INSIGHT_RESULT);

    const { result } = renderHook(() => useConfirmInsight(PROJECT_ID), { wrapper: wrapper() });

    result.current.mutate({ content: "example.com has not been scanned recently", relatedNodeIds: [NODE_ID] });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(apiRequest).toHaveBeenCalledWith(`/projects/${PROJECT_ID}/assistant/insights`, {
      method: "POST",
      body: { content: "example.com has not been scanned recently", relatedNodeIds: [NODE_ID] },
    });
    expect(result.current.data?.node.type).toBe("aiInsight");
    expect(result.current.data?.edges).toHaveLength(1);
  });
});
