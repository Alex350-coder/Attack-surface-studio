import type { Request } from "express";

/** Minimal identity carried on `request.user` once `JwtAuthGuard` validates an access token. */
export interface RequestUser {
  sub: string;
  email: string;
}

declare module "express-serve-static-core" {
  interface Request {
    user?: RequestUser;
  }
}

/** Extracts the raw token from a `Authorization: Bearer <token>` header, if well-formed. */
export function extractBearerToken(request: Request): string | undefined {
  const header = request.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    return undefined;
  }
  return header.slice("Bearer ".length).trim() || undefined;
}
