import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useAuthStore } from "@/features/auth/auth.store";
import { ApiError, apiRequest, apiRequestBlob, apiRequestPaginated, apiUpload } from "./api-client";

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

  it("coalesces concurrent 401s into a single refresh call (BUG #1 regression)", async () => {
    // Two requests expire at once (e.g. two parallel queries after the access token TTL elapses).
    // Each hits a 401 independently; without de-duplication, both would call /api/auth/refresh
    // with the same pre-rotation cookie, and the backend's single-use rotation would treat the
    // second call as a replay -- revoking the whole session chain and logging the user out.
    useAuthStore.getState().setSession({ accessToken: "stale-token", user: { id: "u1", email: "a@b.com", displayName: null } });
    vi.mocked(fetch).mockImplementation((input) => {
      const url = typeof input === "string" ? input : (input as Request).url;
      if (url.includes("/api/auth/refresh")) {
        return Promise.resolve(jsonResponse(200, { success: true, data: { accessToken: "fresh-token" } }));
      }
      if (url.includes("/projects/a") || url.includes("/projects/b")) {
        const alreadyRefreshed = useAuthStore.getState().accessToken === "fresh-token";
        return Promise.resolve(
          alreadyRefreshed
            ? jsonResponse(200, { success: true, data: { ok: true } })
            : jsonResponse(401, { success: false, error: { message: "Unauthorized", code: "UNAUTHORIZED", correlationId: "c" } }),
        );
      }
      throw new Error(`Unexpected fetch to ${url}`);
    });

    const [resultA, resultB] = await Promise.all([apiRequest("/projects/a"), apiRequest("/projects/b")]);

    expect(resultA).toEqual({ ok: true });
    expect(resultB).toEqual({ ok: true });
    const refreshCalls = vi.mocked(fetch).mock.calls.filter(([input]) => {
      const url = typeof input === "string" ? input : (input as Request).url;
      return url.includes("/api/auth/refresh");
    });
    expect(refreshCalls).toHaveLength(1);
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

describe("apiUpload", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    useAuthStore.getState().clear();
  });

  it("sends the FormData body without a manual Content-Type header", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(jsonResponse(201, { success: true, data: { id: "e1" } }));
    const formData = new FormData();
    formData.append("file", new Blob(["x"]), "evidence.png");

    const result = await apiUpload<{ id: string }>("/projects/p1/evidence", formData);

    expect(result).toEqual({ id: "e1" });
    const [, init] = vi.mocked(fetch).mock.calls[0];
    expect(init?.body).toBe(formData);
    expect((init?.headers as Record<string, string>)["Content-Type"]).toBeUndefined();
  });
});

describe("apiRequestBlob", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    useAuthStore.getState().clear();
  });

  it("returns the response body as a Blob with the Authorization header attached", async () => {
    useAuthStore.getState().setSession({ accessToken: "token-1", user: { id: "u1", email: "a@b.com", displayName: null } });
    vi.mocked(fetch).mockResolvedValueOnce(new Response("raw bytes", { status: 200 }));

    const result = await apiRequestBlob("/projects/p1/runs/r1/raw");

    expect(result).toBeInstanceOf(Blob);
    expect(await result.text()).toBe("raw bytes");
    const [, init] = vi.mocked(fetch).mock.calls[0];
    expect((init?.headers as Record<string, string>).Authorization).toBe("Bearer token-1");
  });

  it("throws an ApiError on a non-OK response, never a raw Response", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(new Response(null, { status: 403 }));

    await expect(apiRequestBlob("/projects/p1/runs/r1/raw")).rejects.toBeInstanceOf(ApiError);
  });
});
