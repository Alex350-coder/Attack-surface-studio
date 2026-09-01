import { afterEach, describe, expect, it, vi } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useCurrentRole } from "./use-current-role";
import { apiRequestPaginated } from "@/lib/api-client";
import { useAuthStore } from "@/features/auth/auth.store";

vi.mock("@/lib/api-client", () => ({ apiRequestPaginated: vi.fn(), apiRequest: vi.fn() }));

const PROJECT_ID = "11111111-1111-1111-1111-111111111111";
const USER_ID = "22222222-2222-2222-2222-222222222222";

function renderWithProviders() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return renderHook(() => useCurrentRole(PROJECT_ID), {
    wrapper: ({ children }) => <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>,
  });
}

describe("useCurrentRole", () => {
  afterEach(() => {
    vi.clearAllMocks();
    useAuthStore.getState().clear();
  });

  it("resolves the signed-in user's role from the members list", async () => {
    useAuthStore.getState().setSession({ accessToken: "token", user: { id: USER_ID, email: "a@b.com", displayName: null } });
    vi.mocked(apiRequestPaginated).mockResolvedValue({
      items: [
        {
          id: "33333333-3333-3333-3333-333333333333",
          projectId: PROJECT_ID,
          userId: USER_ID,
          role: "admin",
          createdAt: new Date(),
        },
        {
          id: "44444444-4444-4444-4444-444444444444",
          projectId: PROJECT_ID,
          userId: "55555555-5555-5555-5555-555555555555",
          role: "viewer",
          createdAt: new Date(),
        },
      ],
    });

    const { result } = renderWithProviders();

    await waitFor(() => expect(result.current.role).toBe("admin"));
  });

  it("returns null when the user is not in the members list", async () => {
    useAuthStore.getState().setSession({ accessToken: "token", user: { id: USER_ID, email: "a@b.com", displayName: null } });
    vi.mocked(apiRequestPaginated).mockResolvedValue({ items: [] });

    const { result } = renderWithProviders();

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.role).toBeNull();
  });
});
