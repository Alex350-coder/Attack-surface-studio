import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useAuthStore } from "@/features/auth/auth.store";
import { ApiError, apiRequest, apiRequestPaginated } from "./api-client";

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

describe("apiRequest", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    useAuthStore.getState().clear();
  });

  it("returns the unwrapped data payload on success", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(jsonResponse(200, { success: true, data: { id: "p1" } }));

    const result = await apiRequest<{ id: string }>("/projects/p1");

    expect(result).toEqual({ id: "p1" });
  });

  it("attaches the Authorization header from the auth store", async () => {
    useAuthStore.getState().setSession({ accessToken: "token-1", user: { id: "u1", email: "a@b.com", displayName: null } });
    vi.mocked(fetch).mockResolvedValueOnce(jsonResponse(200, { success: true, data: {} }));

    await apiRequest("/projects");

    const [, init] = vi.mocked(fetch).mock.calls[0];
    expect((init?.headers as Record<string, string>).Authorization).toBe("Bearer token-1");
  });

  it("throws a safe ApiError on a failure envelope, never a raw Response", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      jsonResponse(404, { success: false, error: { message: "Project not found", code: "NOT_FOUND", correlationId: "corr-1" } }),
    );

    await expect(apiRequest("/projects/missing")).rejects.toMatchObject({
      message: "Project not found",
      code: "NOT_FOUND",
      correlationId: "corr-1",
    });
  });

  it("is an instance of ApiError", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      jsonResponse(500, { success: false, error: { message: "Internal server error", code: "INTERNAL_ERROR", correlationId: "corr-2" } }),
    );

    await expect(apiRequest("/x")).rejects.toBeInstanceOf(ApiError);
  });

  it("refreshes the access token once on a 401 and retries the original request", async () => {
    useAuthStore.getState().setSession({ accessToken: "stale-token", user: { id: "u1", email: "a@b.com", displayName: null } });
    vi.mocked(fetch)
      .mockResolvedValueOnce(jsonResponse(401, { success: false, error: { message: "Unauthorized", code: "UNAUTHORIZED", correlationId: "c" } }))
      .mockResolvedValueOnce(jsonResponse(200, { success: true, data: { accessToken: "fresh-token" } }))
      .mockResolvedValueOnce(jsonResponse(200, { success: true, data: { ok: true } }));

    const result = await apiRequest<{ ok: boolean }>("/projects");

    expect(result).toEqual({ ok: true });
    expect(useAuthStore.getState().accessToken).toBe("fresh-token");
    expect(fetch).toHaveBeenCalledTimes(3);
  });

  it("clears the session when the refresh itself fails", async () => {
    useAuthStore.getState().setSession({ accessToken: "stale-token", user: { id: "u1", email: "a@b.com", displayName: null } });
    vi.mocked(fetch)
      .mockResolvedValueOnce(jsonResponse(401, { success: false, error: { message: "Unauthorized", code: "UNAUTHORIZED", correlationId: "c" } }))
      .mockResolvedValueOnce(new Response(null, { status: 401 }));

    await expect(apiRequest("/projects")).rejects.toBeInstanceOf(ApiError);
    expect(useAuthStore.getState().accessToken).toBeNull();
  });
});

describe("apiRequestPaginated", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns both items and pagination meta", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      jsonResponse(200, { success: true, data: [{ id: "1" }], meta: { total: 1, page: 1, pageSize: 20 } }),
    );

    const result = await apiRequestPaginated<Array<{ id: string }>>("/projects");

    expect(result.items).toEqual([{ id: "1" }]);
    expect(result.meta).toEqual({ total: 1, page: 1, pageSize: 20 });
  });
});
