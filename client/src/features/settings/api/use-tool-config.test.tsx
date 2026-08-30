import { afterEach, describe, expect, it, vi } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useDetectTool, useSetToolConfig, useToolConfig } from "./use-tool-config";
import { apiRequest } from "@/lib/api-client";

vi.mock("@/lib/api-client", () => ({ apiRequest: vi.fn() }));

const PROJECT_ID = "11111111-1111-1111-1111-111111111111";
const TOOL_ID = "nmap";
const CONFIG = {
  id: "22222222-2222-2222-2222-222222222222",
  projectId: PROJECT_ID,
  adapterId: TOOL_ID,
  executionMode: "local",
  config: {},
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

function wrapper() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

describe("useToolConfig", () => {
  afterEach(() => vi.clearAllMocks());

  it("fetches and Zod-parses the tool's config", async () => {
    vi.mocked(apiRequest).mockResolvedValue(CONFIG);

    const { result } = renderHook(() => useToolConfig(PROJECT_ID, TOOL_ID), { wrapper: wrapper() });

    await waitFor(() => expect(result.current.data?.adapterId).toBe(TOOL_ID));
    expect(apiRequest).toHaveBeenCalledWith(`/projects/${PROJECT_ID}/tools/${TOOL_ID}/config`);
  });

  it("resolves to null when no config has been set yet", async () => {
    vi.mocked(apiRequest).mockResolvedValue(null);

    const { result } = renderHook(() => useToolConfig(PROJECT_ID, TOOL_ID), { wrapper: wrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toBeNull();
  });
});

describe("useSetToolConfig", () => {
  afterEach(() => vi.clearAllMocks());

  it("PUTs the execution mode and config", async () => {
    vi.mocked(apiRequest).mockResolvedValue(CONFIG);

    const { result } = renderHook(() => useSetToolConfig(PROJECT_ID, TOOL_ID), { wrapper: wrapper() });

    result.current.mutate({ executionMode: "local", config: {} });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(apiRequest).toHaveBeenCalledWith(`/projects/${PROJECT_ID}/tools/${TOOL_ID}/config`, {
      method: "PUT",
      body: { executionMode: "local", config: {} },
    });
  });
});

describe("useDetectTool", () => {
  afterEach(() => vi.clearAllMocks());

  it("POSTs the mode and Zod-parses the detection result", async () => {
    vi.mocked(apiRequest).mockResolvedValue({ available: true, version: "7.94" });

    const { result } = renderHook(() => useDetectTool(PROJECT_ID, TOOL_ID), { wrapper: wrapper() });

    result.current.mutate("local");

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(apiRequest).toHaveBeenCalledWith(`/projects/${PROJECT_ID}/tools/${TOOL_ID}/detect`, {
      method: "POST",
      body: { mode: "local" },
    });
    expect(result.current.data?.available).toBe(true);
  });
});
