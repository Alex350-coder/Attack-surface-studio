import { afterEach, describe, expect, it, vi } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { isNonTerminal, useCancelRun, useEnqueueRun, useRuns } from "./use-runs";
import { apiRequest, apiRequestPaginated } from "@/lib/api-client";

vi.mock("@/lib/api-client", () => ({ apiRequest: vi.fn(), apiRequestPaginated: vi.fn() }));

const PROJECT_ID = "11111111-1111-1111-1111-111111111111";
const RUN = {
  id: "22222222-2222-2222-2222-222222222222",
  projectId: PROJECT_ID,
  adapterId: "nmap",
  executionMode: "local",
  target: "example.com",
  status: "queued" as const,
  queuedAt: new Date(),
  startedAt: null,
  finishedAt: null,
  triggeredBy: "33333333-3333-3333-3333-333333333333",
  stats: null,
  error: null,
};

function wrapper() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

describe("isNonTerminal", () => {
  it("treats queued and running as non-terminal, everything else as terminal", () => {
    expect(isNonTerminal("queued")).toBe(true);
    expect(isNonTerminal("running")).toBe(true);
    expect(isNonTerminal("succeeded")).toBe(false);
    expect(isNonTerminal("failed")).toBe(false);
    expect(isNonTerminal("cancelled")).toBe(false);
  });
});

describe("useRuns", () => {
  afterEach(() => vi.clearAllMocks());

  it("fetches and Zod-parses the project's run list", async () => {
    vi.mocked(apiRequestPaginated).mockResolvedValue({ items: [RUN] });

    const { result } = renderHook(() => useRuns(PROJECT_ID), { wrapper: wrapper() });

    await waitFor(() => expect(result.current.data).toHaveLength(1));
    expect(apiRequestPaginated).toHaveBeenCalledWith(`/projects/${PROJECT_ID}/runs`);
  });
});

describe("useEnqueueRun", () => {
  afterEach(() => vi.clearAllMocks());

  it("posts the run input and returns the parsed run", async () => {
    vi.mocked(apiRequest).mockResolvedValue(RUN);

    const { result } = renderHook(() => useEnqueueRun(PROJECT_ID), { wrapper: wrapper() });
    result.current.mutate({ adapterId: "nmap", executionMode: "local", target: "example.com" });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(apiRequest).toHaveBeenCalledWith(`/projects/${PROJECT_ID}/runs`, {
      method: "POST",
      body: { adapterId: "nmap", executionMode: "local", target: "example.com" },
    });
  });
});

describe("useCancelRun", () => {
  afterEach(() => vi.clearAllMocks());

  it("posts to the cancel endpoint for the given run id", async () => {
    vi.mocked(apiRequest).mockResolvedValue({ ...RUN, status: "cancelled" });

    const { result } = renderHook(() => useCancelRun(PROJECT_ID), { wrapper: wrapper() });
    result.current.mutate(RUN.id);

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(apiRequest).toHaveBeenCalledWith(`/projects/${PROJECT_ID}/runs/${RUN.id}/cancel`, { method: "POST" });
  });
});
