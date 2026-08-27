import { NextResponse, type NextRequest } from "next/server";
import { REFRESH_TOKEN_COOKIE } from "@/lib/auth-cookies";

/**
 * Coarse, fast gate for the authed app shell: redirects to /login when the httpOnly refresh
 * cookie is absent. This is a UX convenience only -- real authorization is enforced server-side
 * on every API call regardless (FE-005); a stale or revoked cookie still results in a 401 from
 * the backend, handled by api-client.ts's refresh-then-clear flow.
 */
export function middleware(request: NextRequest): NextResponse {
  const hasRefreshCookie = request.cookies.has(REFRESH_TOKEN_COOKIE);

  if (!hasRefreshCookie) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("from", request.nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/app/:path*"],
};
