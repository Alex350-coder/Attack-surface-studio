import { afterEach, describe, expect, it, vi } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { useAddOrAssignMember, useProjectMembers } from "./use-project-members";
import { apiRequest, apiRequestPaginated } from "@/lib/api-client";
import { queryClientWrapper } from "@/lib/test/query-client-wrapper";

vi.mock("@/lib/api-client", () => ({ apiRequest: vi.fn(), apiRequestPaginated: vi.fn() }));

const PROJECT_ID = "11111111-1111-1111-1111-111111111111";
const MEMBER = {
  id: "22222222-2222-2222-2222-222222222222",
  projectId: PROJECT_ID,
  userId: "33333333-3333-3333-3333-333333333333",
  email: "member@example.com",
  displayName: null,
  role: "admin",
  createdAt: new Date().toISOString(),
};

describe("useProjectMembers", () => {
  afterEach(() => vi.clearAllMocks());

  it("fetches and Zod-parses the project's member list, requesting the server's max page size (BUG #12 sibling)", async () => {
    // MembersPanel has no pager UI -- without an explicit pageSize, a project with more than
    // DEFAULT_PAGE_SIZE=25 members would silently lose access to the rest, with no indication.
    vi.mocked(apiRequestPaginated).mockResolvedValue({ items: [MEMBER] });

    const { result } = renderHook(() => useProjectMembers(PROJECT_ID), { wrapper: queryClientWrapper() });

    await waitFor(() => expect(result.current.data).toHaveLength(1));
    expect(apiRequestPaginated).toHaveBeenCalledWith(`/projects/${PROJECT_ID}/members?pageSize=100`);
  });
});

describe("useAddOrAssignMember", () => {
  afterEach(() => vi.clearAllMocks());

  it("posts the email/role and Zod-parses the resulting member", async () => {
    vi.mocked(apiRequest).mockResolvedValue(MEMBER);

    const { result } = renderHook(() => useAddOrAssignMember(PROJECT_ID), { wrapper: queryClientWrapper() });

    result.current.mutate({ email: "a@b.com", role: "admin" });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(apiRequest).toHaveBeenCalledWith(`/projects/${PROJECT_ID}/members`, {
      method: "POST",
      body: { email: "a@b.com", role: "admin" },
    });
  });
});
