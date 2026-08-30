import type { NextResponse } from "next/server";

export const REFRESH_TOKEN_COOKIE = "refresh_token";

const DEFAULT_MAX_AGE_SECONDS = 60 * 60 * 24 * 7; // matches the backend's default JWT_REFRESH_TTL (7d)

/**
 * Cookie flags for the refresh token (SEC-034/SEC-035): httpOnly so browser JS can never read
 * it, Secure outside local dev, Lax same-site (these are same-origin requests to our own pages).
 * `path: "/"` -- narrower scoping to `/api/auth` was tried first, but cookie Path only controls
 * which *requests* carry the cookie, not which server code can read it; a Path of `/api/auth`
 * meant the browser never attached it to a plain navigation to `/app`, so proxy.ts's coarse
 * "is there a session" gate could never see it. The cookie is still origin-scoped by the browser
 * (never sent to the backend's own origin, only to this Next.js app), which is the boundary that
 * actually matters here.
 */
function refreshTokenCookieOptions(maxAgeSeconds: number) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: maxAgeSeconds,
  };
}

export function setRefreshTokenCookie(response: NextResponse, refreshToken: string): void {
  response.cookies.set(REFRESH_TOKEN_COOKIE, refreshToken, refreshTokenCookieOptions(DEFAULT_MAX_AGE_SECONDS));
}

export function clearRefreshTokenCookie(response: NextResponse): void {
  response.cookies.set(REFRESH_TOKEN_COOKIE, "", refreshTokenCookieOptions(0));
}
