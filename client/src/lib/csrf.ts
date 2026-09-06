import { NextResponse, type NextRequest } from "next/server";

/**
 * CSRF defense-in-depth (SEC-034) for the cookie-authenticated BFF auth routes
 * (`app/api/auth/refresh`, `app/api/auth/logout`). `SameSite=Lax` on the refresh cookie
 * (auth-cookies.ts) already blocks the classic cross-site `<form>` POST, but Lax still allows
 * top-level cross-site navigations and doesn't cover every client edge case -- an explicit
 * Origin check is the standard second layer (OWASP CSRF cheat sheet's "Verifying Origin/Referer").
 *
 * Checks `Origin` first (present on virtually every same-origin `fetch`/XHR POST in modern
 * browsers), falling back to `Referer` only when `Origin` is absent. A request with neither
 * header is let through rather than rejected: SameSite=Lax already covers that gap, and
 * rejecting would risk breaking legitimate same-origin requests from older or unusual clients
 * with no positive evidence of a cross-site origin.
 */
export function assertTrustedOrigin(request: NextRequest): NextResponse | null {
  const ownOrigin = request.nextUrl.origin;
  const sourceOrigin = originFromHeader(request.headers.get("origin")) ?? originFromHeader(request.headers.get("referer"));

  if (sourceOrigin && sourceOrigin !== ownOrigin) {
    return NextResponse.json(
      { success: false, error: { message: "Cross-origin request rejected.", code: "FORBIDDEN", correlationId: "" } },
      { status: 403 },
    );
  }

  return null;
}

function originFromHeader(value: string | null): string | null {
  if (!value) {
    return null;
  }
  try {
    return new URL(value).origin;
  } catch {
    return null;
  }
}
