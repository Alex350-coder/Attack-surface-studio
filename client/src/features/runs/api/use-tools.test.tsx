import { afterEach, describe, expect, it, vi } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { useTools } from "./use-tools";
import { apiRequest } from "@/lib/api-client";
import { queryClientWrapper } from "@/lib/test/query-client-wrapper";

vi.mock("@/lib/api-client", () => ({ apiRequest: vi.fn() }));

describe("useTools", () => {
  afterEach(() => vi.clearAllMocks());

  it("fetches and Zod-parses the tool registry", async () => {
    vi.mocked(apiRequest).mockResolvedValue([{ id: "nmap", displayName: "Nmap", supportedModes: ["local"] }]);

    const { result } = renderHook(() => useTools(), { wrapper: queryClientWrapper() });

    await waitFor(() => expect(result.current.data).toHaveLength(1));
    expect(apiRequest).toHaveBeenCalledWith("/tools");
  });
});
