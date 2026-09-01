import { afterEach, describe, expect, it, vi } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useRun } from "./use-run";
import { apiRequest } from "@/lib/api-client";

vi.mock("@/lib/api-client", () => ({ apiRequest: vi.fn() }));

const PROJECT_ID = "11111111-1111-1111-1111-111111111111";
const RUN_ID = "22222222-2222-2222-2222-222222222222";

function wrapper() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

describe("useRun", () => {
  afterEach(() => vi.clearAllMocks());

  it("fetches and Zod-parses a single run", async () => {
    vi.mocked(apiRequest).mockResolvedValue({
      id: RUN_ID,
      projectId: PROJECT_ID,
      adapterId: "nmap",
      executionMode: "local",
      target: "example.com",
      status: "succeeded",
      queuedAt: new Date().toISOString(),
      startedAt: new Date().toISOString(),
      finishedAt: new Date().toISOString(),
      triggeredBy: "33333333-3333-3333-3333-333333333333",
      stats: null,
      error: null,
    });

    const { result } = renderHook(() => useRun(PROJECT_ID, RUN_ID), { wrapper: wrapper() });

    await waitFor(() => expect(result.current.data?.status).toBe("succeeded"));
    expect(apiRequest).toHaveBeenCalledWith(`/projects/${PROJECT_ID}/runs/${RUN_ID}`);
  });
});
