import { NextResponse, type NextRequest } from "next/server";
import { backendRequest } from "@/lib/backend-client";
import { REFRESH_TOKEN_COOKIE, clearRefreshTokenCookie } from "@/lib/auth-cookies";

/**
 * BFF logout endpoint. Invalidates the refresh token server-side (SEC-005) before clearing the
 * cookie, so a copied cookie value can't be replayed after logout. The backend's /auth/logout
 * is guarded (requires a valid access token), so the caller forwards its current access token
 * via the Authorization header -- the same one it already holds in memory. The cookie is
 * cleared unconditionally, even if the backend call fails or no access token is available: this
 * browser's session always ends locally, and server-side invalidation happens whenever an
 * access token is available to authorize it.
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  const refreshToken = request.cookies.get(REFRESH_TOKEN_COOKIE)?.value;
  const authorization = request.headers.get("authorization") ?? undefined;

  if (refreshToken && authorization) {
    await backendRequest("/auth/logout", { body: { refreshToken }, authorization }).catch(() => null);
  }

  const response = NextResponse.json({ success: true, data: null });
  clearRefreshTokenCookie(response);
  return response;
}
