import { afterEach, describe, expect, it, vi } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useUpdateProject } from "./use-update-project";
import { apiRequest } from "@/lib/api-client";

vi.mock("@/lib/api-client", () => ({ apiRequest: vi.fn() }));

const PROJECT_ID = "11111111-1111-1111-1111-111111111111";
const PROJECT = {
  id: PROJECT_ID,
  name: "Acme Corp",
  slug: "acme-corp",
  scope: { includes: ["example.com"], excludes: [] },
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

function wrapper() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

describe("useUpdateProject", () => {
  afterEach(() => vi.clearAllMocks());

  it("patches the project and Zod-parses the result", async () => {
    vi.mocked(apiRequest).mockResolvedValue(PROJECT);

    const { result } = renderHook(() => useUpdateProject(PROJECT_ID), { wrapper: wrapper() });

    result.current.mutate({ name: "Acme Corp" });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(apiRequest).toHaveBeenCalledWith(`/projects/${PROJECT_ID}`, {
      method: "PATCH",
      body: { name: "Acme Corp" },
    });
  });
});
