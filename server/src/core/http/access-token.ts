import type { JwtService } from "@nestjs/jwt";
import type { ConfigService } from "@nestjs/config";
import type { EnvConfig } from "../config/env.schema";
import type { RequestUser } from "./request-user";

/**
 * Verifies a JWT access token and returns the identity it carries, or `null` if the token is
 * missing/invalid/expired. Shared by `JwtAuthGuard` (which turns `null` into a 401) and
 * `RlsContextMiddleware` (which treats `null` as "no RLS context for this request" and lets
 * downstream guards decide whether that's an error).
 */
export async function verifyAccessToken(
  token: string,
  jwtService: JwtService,
  configService: ConfigService<EnvConfig, true>,
): Promise<RequestUser | null> {
  try {
    const payload = await jwtService.verifyAsync<RequestUser>(token, {
      secret: configService.get("JWT_ACCESS_SECRET", { infer: true }),
    });
    return { sub: payload.sub, email: payload.email };
  } catch {
    return null;
  }
}
