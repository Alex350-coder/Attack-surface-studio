import { afterEach, describe, expect, it, vi } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useTools } from "./use-tools";
import { apiRequest } from "@/lib/api-client";

vi.mock("@/lib/api-client", () => ({ apiRequest: vi.fn() }));

function wrapper() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

describe("useTools", () => {
  afterEach(() => vi.clearAllMocks());

  it("fetches and Zod-parses the tool registry", async () => {
    vi.mocked(apiRequest).mockResolvedValue([{ id: "nmap", displayName: "Nmap", supportedModes: ["local"] }]);

    const { result } = renderHook(() => useTools(), { wrapper: wrapper() });

    await waitFor(() => expect(result.current.data).toHaveLength(1));
    expect(apiRequest).toHaveBeenCalledWith("/tools");
  });
});
