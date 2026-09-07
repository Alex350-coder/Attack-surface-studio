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

  it("clears the store and redirects to /login when the refresh cookie is missing or invalid", async () => {
    const { refreshAccessToken } = await import("@/lib/api-client");
    vi.mocked(refreshAccessToken).mockResolvedValueOnce(null);

    renderHook(() => useBootstrapSession());

    await waitFor(() => expect(replace).toHaveBeenCalledWith("/login"));
    expect(useAuthStore.getState().accessToken).toBeNull();
  });
});
