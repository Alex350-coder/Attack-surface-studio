import { afterEach, describe, expect, it, vi } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useAddOrAssignMember, useProjectMembers } from "./use-project-members";
import { apiRequest, apiRequestPaginated } from "@/lib/api-client";

vi.mock("@/lib/api-client", () => ({ apiRequest: vi.fn(), apiRequestPaginated: vi.fn() }));

const PROJECT_ID = "11111111-1111-1111-1111-111111111111";
const MEMBER = {
  id: "22222222-2222-2222-2222-222222222222",
  projectId: PROJECT_ID,
  userId: "33333333-3333-3333-3333-333333333333",
  role: "admin",
  createdAt: new Date().toISOString(),
};

function wrapper() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

describe("useProjectMembers", () => {
  afterEach(() => vi.clearAllMocks());

  it("fetches and Zod-parses the project's member list", async () => {
    vi.mocked(apiRequestPaginated).mockResolvedValue({ items: [MEMBER] });

    const { result } = renderHook(() => useProjectMembers(PROJECT_ID), { wrapper: wrapper() });

    await waitFor(() => expect(result.current.data).toHaveLength(1));
    expect(apiRequestPaginated).toHaveBeenCalledWith(`/projects/${PROJECT_ID}/members`);
  });
});

describe("useAddOrAssignMember", () => {
  afterEach(() => vi.clearAllMocks());

  it("posts the email/role and Zod-parses the resulting member", async () => {
    vi.mocked(apiRequest).mockResolvedValue(MEMBER);

    const { result } = renderHook(() => useAddOrAssignMember(PROJECT_ID), { wrapper: wrapper() });

    result.current.mutate({ email: "a@b.com", role: "admin" });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(apiRequest).toHaveBeenCalledWith(`/projects/${PROJECT_ID}/members`, {
      method: "POST",
      body: { email: "a@b.com", role: "admin" },
    });
  });
});
