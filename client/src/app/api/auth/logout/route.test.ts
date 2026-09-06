import { afterEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { REFRESH_TOKEN_COOKIE } from "@/lib/auth-cookies";

const backendRequestMock = vi.hoisted(() => vi.fn());
vi.mock("@/lib/backend-client", () => ({ backendRequest: backendRequestMock }));

const { POST } = await import("./route");

const OWN_ORIGIN = "http://localhost:3000";

function buildRequest(options: { origin?: string; cookie?: string; authorization?: string } = {}): NextRequest {
  const headers = new Headers();
  if (options.origin !== undefined) headers.set("origin", options.origin);
  if (options.cookie !== undefined) headers.set("cookie", options.cookie);
  if (options.authorization !== undefined) headers.set("authorization", options.authorization);

  return new NextRequest(`${OWN_ORIGIN}/api/auth/logout`, { method: "POST", headers });
}

describe("POST /api/auth/logout", () => {
  afterEach(() => {
    backendRequestMock.mockReset();
  });

  it("rejects a cross-origin request with 403 before touching the backend or clearing the cookie", async () => {
    const request = buildRequest({
      origin: "https://evil.example.com",
      cookie: `${REFRESH_TOKEN_COOKIE}=some-refresh`,
      authorization: "Bearer access-token",
    });

    const response = await POST(request);

    expect(response.status).toBe(403);
    expect(backendRequestMock).not.toHaveBeenCalled();
  });

  it("proceeds for a same-origin request, invalidates server-side, and always clears the cookie", async () => {
    backendRequestMock.mockResolvedValueOnce({ status: 200, envelope: { success: true, data: null } });
    const request = buildRequest({
      origin: OWN_ORIGIN,
      cookie: `${REFRESH_TOKEN_COOKIE}=some-refresh`,
      authorization: "Bearer access-token",
    });

    const response = await POST(request);
    const body = (await response.json()) as { success: boolean };

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(backendRequestMock).toHaveBeenCalledWith("/auth/logout", {
      body: { refreshToken: "some-refresh" },
      authorization: "Bearer access-token",
    });
    expect(response.cookies.get(REFRESH_TOKEN_COOKIE)?.value).toBe("");
  });

  it("clears the cookie for a same-origin request even without an access token", async () => {
    const request = buildRequest({ origin: OWN_ORIGIN });

    const response = await POST(request);

    expect(response.status).toBe(200);
    expect(backendRequestMock).not.toHaveBeenCalled();
    expect(response.cookies.get(REFRESH_TOKEN_COOKIE)?.value).toBe("");
  });
});
