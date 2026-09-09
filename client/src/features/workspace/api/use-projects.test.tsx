import { afterEach, describe, expect, it, vi } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { apiRequestPaginated } from "@/lib/api-client";
import { useProjects } from "./use-projects";

vi.mock("@/lib/api-client", () => ({
  apiRequest: vi.fn(),
  apiRequestPaginated: vi.fn(),
}));

function wrapper({ children }: { children: ReactNode }) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}

const PROJECT = {
  id: "11111111-1111-1111-1111-111111111111",
  name: "Acme Corp",
  slug: "acme-corp",
  scope: {},
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe("useProjects", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("requests the server's max page size instead of the 25-item default (BUG #12)", async () => {
    // With no pageSize, the server defaults to DEFAULT_PAGE_SIZE=25 (repository.types.ts) and
    // ProjectList has no "load more"/pager UI -- an account with more than 25 projects silently
    // lost access to the rest from the Projects page, with no error or indicator of any kind.
    // Requesting the server's hard cap (MAX_PAGE_SIZE=100) closes that gap for any realistic
    // project count.
    vi.mocked(apiRequestPaginated).mockResolvedValue({ items: [PROJECT] });

    renderHook(() => useProjects(), { wrapper });

    await waitFor(() => expect(apiRequestPaginated).toHaveBeenCalledWith("/projects?pageSize=100"));
  });
});
