import type { NextResponse } from "next/server";

export const REFRESH_TOKEN_COOKIE = "refresh_token";

const DEFAULT_MAX_AGE_SECONDS = 60 * 60 * 24 * 7; // matches the backend's default JWT_REFRESH_TTL (7d)

/**
 * Cookie flags for the refresh token (SEC-034/SEC-035): httpOnly so browser JS can never read
 * it, scoped to only the BFF's own auth routes (never sent to /app or the backend origin),
 * Secure outside local dev, Lax same-site (these are same-origin POSTs from our own pages).
 */
function refreshTokenCookieOptions(maxAgeSeconds: number) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/api/auth",
    maxAge: maxAgeSeconds,
  };
}

export function setRefreshTokenCookie(response: NextResponse, refreshToken: string): void {
  response.cookies.set(REFRESH_TOKEN_COOKIE, refreshToken, refreshTokenCookieOptions(DEFAULT_MAX_AGE_SECONDS));
}

export function clearRefreshTokenCookie(response: NextResponse): void {
  response.cookies.set(REFRESH_TOKEN_COOKIE, "", refreshTokenCookieOptions(0));
}
