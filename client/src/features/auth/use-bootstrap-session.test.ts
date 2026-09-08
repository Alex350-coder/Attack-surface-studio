import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { renderHook, waitFor, cleanup } from "@testing-library/react";
import { useAuthStore } from "./auth.store";
import { useBootstrapSession } from "./use-bootstrap-session";

const replace = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace }),
}));

vi.mock("@/lib/api-client", () => ({
  apiRequest: vi.fn(),
  refreshAccessToken: vi.fn(),
}));

describe("useBootstrapSession", () => {
  afterEach(() => {
    cleanup();
    replace.mockClear();
    useAuthStore.getState().clear();
  });

  it("is immediately ready when a session already exists", () => {
    useAuthStore.getState().setSession({ accessToken: "tok", user: { id: "u1", email: "a@b.com", displayName: null } });

    const { result } = renderHook(() => useBootstrapSession());

    expect(result.current.isReady).toBe(true);
  });

  it("silently refreshes the session on a hard reload and becomes ready", async () => {
    const { apiRequest, refreshAccessToken } = await import("@/lib/api-client");
    vi.mocked(refreshAccessToken).mockResolvedValueOnce("fresh");
    vi.mocked(apiRequest).mockResolvedValueOnce({ id: "u1", email: "a@b.com", displayName: null });

    const { result } = renderHook(() => useBootstrapSession());

    await waitFor(() => expect(result.current.isReady).toBe(true));
    expect(useAuthStore.getState().accessToken).toBe("fresh");
    expect(replace).not.toHaveBeenCalled();
  });

  it("still sets the user even though refreshAccessToken flips accessToken mid-bootstrap (BUG #9)", async () => {
    // The real `refreshAccessToken` sets `accessToken` on the store as soon as it resolves,
    // *before* `/auth/me` returns -- reproduce that here instead of a bare resolved value, since
    // a mock that only returns a token (as the test above does) can't expose the effect
    // re-running and tearing down the in-flight bootstrap before `setSession` runs.
    const { apiRequest, refreshAccessToken } = await import("@/lib/api-client");
    vi.mocked(refreshAccessToken).mockImplementationOnce(async () => {
      useAuthStore.getState().setAccessToken("fresh");
      return "fresh";
    });
    vi.mocked(apiRequest).mockResolvedValueOnce({ id: "u1", email: "a@b.com", displayName: null });

    renderHook(() => useBootstrapSession());

    // `isReady` flips true as soon as `accessToken` is set (by design, see auth.store.ts's
    // `useIsAuthenticated`), which is exactly what let this race hide before -- so this
    // assertion waits on `user` directly rather than on `isReady`.
    await waitFor(() => expect(useAuthStore.getState().user).toEqual({ id: "u1", email: "a@b.com", displayName: null }));
  });

  it("clears the store and redirects to /login when the refresh cookie is missing or invalid", async () => {
    const { refreshAccessToken } = await import("@/lib/api-client");
    vi.mocked(refreshAccessToken).mockResolvedValueOnce(null);

    renderHook(() => useBootstrapSession());

    await waitFor(() => expect(replace).toHaveBeenCalledWith("/login"));
    expect(useAuthStore.getState().accessToken).toBeNull();
  });
});
