import { NextResponse, type NextRequest } from "next/server";
import { backendRequest } from "@/lib/backend-client";
import { REFRESH_TOKEN_COOKIE, clearRefreshTokenCookie, setRefreshTokenCookie } from "@/lib/auth-cookies";

interface TokenPairBody {
  accessToken: string;
  refreshToken: string;
}

/**
 * BFF refresh endpoint. Reads the refresh token exclusively from the httpOnly cookie -- never
 * from a request body -- so browser JS can never supply or read it (SEC-035). Rotates the
 * cookie on every call, matching the backend's rotating-refresh-token model, and clears it if
 * the token was invalid or already used.
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  const refreshToken = request.cookies.get(REFRESH_TOKEN_COOKIE)?.value;
  if (!refreshToken) {
    return NextResponse.json(
      { success: false, error: { message: "Session expired.", code: "UNAUTHORIZED", correlationId: "" } },
      { status: 401 },
    );
  }

  const { status, envelope } = await backendRequest<TokenPairBody>("/auth/refresh", { body: { refreshToken } });
  if (!envelope.success) {
    const response = NextResponse.json(envelope, { status });
    clearRefreshTokenCookie(response);
    return response;
  }

  const response = NextResponse.json({ success: true, data: { accessToken: envelope.data.accessToken } });
  setRefreshTokenCookie(response, envelope.data.refreshToken);
  return response;
}
