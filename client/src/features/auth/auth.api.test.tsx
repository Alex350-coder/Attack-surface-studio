import { afterEach, describe, expect, it, vi } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useLogout } from "./auth.api";
import { useAuthStore } from "./auth.store";

function renderWithClient(client: QueryClient) {
  return renderHook(() => useLogout(), {
    wrapper: ({ children }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>,
  });
}

describe("useLogout", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    useAuthStore.getState().clear();
  });

  it("clears the auth store and the entire query cache on success (BUG #6)", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: true, json: async () => ({ success: true, data: undefined }) }),
    );
    useAuthStore.getState().setSession({ accessToken: "token", user: { id: "1", email: "a@b.com", displayName: null } });

    const queryClient = new QueryClient();
    // Simulates data left over from the session being logged out of -- must not survive into
    // whichever account logs in next in this same tab.
    queryClient.setQueryData(["projects"], [{ id: "p1", name: "Stale Project" }]);

    const { result } = renderWithClient(queryClient);
    result.current.mutate();

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(useAuthStore.getState().accessToken).toBeNull();
    expect(queryClient.getQueryData(["projects"])).toBeUndefined();
  });
});
