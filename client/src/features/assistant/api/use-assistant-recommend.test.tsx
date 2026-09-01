import { afterEach, describe, expect, it, vi } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useAssistantRecommend } from "./use-assistant-recommend";
import { apiRequest } from "@/lib/api-client";

vi.mock("@/lib/api-client", () => ({ apiRequest: vi.fn() }));

const PROJECT_ID = "11111111-1111-1111-1111-111111111111";
const ANSWER = {
  answer: "Consider scanning example.com next.",
  referencedNodeIds: ["22222222-2222-2222-2222-222222222222"],
  truncated: false,
};

function wrapper() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

describe("useAssistantRecommend", () => {
  afterEach(() => vi.clearAllMocks());

  it("requests recommendations and Zod-parses the answer", async () => {
    vi.mocked(apiRequest).mockResolvedValue(ANSWER);

    const { result } = renderHook(() => useAssistantRecommend(PROJECT_ID), { wrapper: wrapper() });

    result.current.mutate({});

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(apiRequest).toHaveBeenCalledWith(`/projects/${PROJECT_ID}/assistant/recommend`, {
      method: "POST",
      body: {},
    });
    expect(result.current.data?.answer).toBe(ANSWER.answer);
  });
});
