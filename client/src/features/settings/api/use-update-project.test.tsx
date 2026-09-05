import { afterEach, describe, expect, it, vi } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { useUpdateProject } from "./use-update-project";
import { apiRequest } from "@/lib/api-client";
import { queryClientWrapper } from "@/lib/test/query-client-wrapper";

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

describe("useUpdateProject", () => {
  afterEach(() => vi.clearAllMocks());

  it("patches the project and Zod-parses the result", async () => {
    vi.mocked(apiRequest).mockResolvedValue(PROJECT);

    const { result } = renderHook(() => useUpdateProject(PROJECT_ID), { wrapper: queryClientWrapper() });

    result.current.mutate({ name: "Acme Corp" });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(apiRequest).toHaveBeenCalledWith(`/projects/${PROJECT_ID}`, {
      method: "PATCH",
      body: { name: "Acme Corp" },
    });
  });
});
