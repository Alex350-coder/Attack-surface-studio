import { afterEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { REFRESH_TOKEN_COOKIE } from "@/lib/auth-cookies";

const backendRequestMock = vi.hoisted(() => vi.fn());
vi.mock("@/lib/backend-client", () => ({ backendRequest: backendRequestMock }));

const { POST } = await import("./route");

const OWN_ORIGIN = "http://localhost:3000";

function buildRequest(options: { origin?: string; referer?: string; cookie?: string } = {}): NextRequest {
  const headers = new Headers();
  if (options.origin !== undefined) headers.set("origin", options.origin);
  if (options.referer !== undefined) headers.set("referer", options.referer);
  if (options.cookie !== undefined) headers.set("cookie", options.cookie);

  return new NextRequest(`${OWN_ORIGIN}/api/auth/refresh`, { method: "POST", headers });
}

describe("POST /api/auth/refresh", () => {
  afterEach(() => {
    backendRequestMock.mockReset();
  });

  it("rejects a cross-origin request with 403 before touching the backend", async () => {
    const request = buildRequest({ origin: "https://evil.example.com" });

    const response = await POST(request);

    expect(response.status).toBe(403);
    expect(backendRequestMock).not.toHaveBeenCalled();
  });

  it("rejects a request whose Referer is cross-origin when Origin is absent", async () => {
    const request = buildRequest({ referer: "https://evil.example.com/attack" });

    const response = await POST(request);

    expect(response.status).toBe(403);
    expect(backendRequestMock).not.toHaveBeenCalled();
  });

  it("proceeds for a same-origin request and returns 401 when no refresh cookie is present", async () => {
    const request = buildRequest({ origin: OWN_ORIGIN });

    const response = await POST(request);
    const body = (await response.json()) as { success: boolean };

    expect(response.status).toBe(401);
    expect(body.success).toBe(false);
    expect(backendRequestMock).not.toHaveBeenCalled();
  });

  it("proceeds and rotates the cookie for a same-origin request with a valid refresh cookie", async () => {
    backendRequestMock.mockResolvedValueOnce({
      status: 200,
      envelope: { success: true, data: { accessToken: "new-access", refreshToken: "new-refresh" } },
    });
    const request = buildRequest({ origin: OWN_ORIGIN, cookie: `${REFRESH_TOKEN_COOKIE}=old-refresh` });

    const response = await POST(request);
    const body = (await response.json()) as { success: boolean; data: { accessToken: string } };

    expect(response.status).toBe(200);
    expect(body.data.accessToken).toBe("new-access");
    expect(backendRequestMock).toHaveBeenCalledWith("/auth/refresh", { body: { refreshToken: "old-refresh" } });
    expect(response.cookies.get(REFRESH_TOKEN_COOKIE)?.value).toBe("new-refresh");
  });

  it("allows a request with neither Origin nor Referer (SameSite=Lax covers this gap)", async () => {
    const request = buildRequest({});

    const response = await POST(request);

    expect(response.status).toBe(401);
  });
});
