import { Injectable, type NestMiddleware } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import type { NextFunction, Request, Response } from "express";
import type { EnvConfig } from "../config/env.schema";
import { runWithUserContext } from "../database/rls";
import { verifyAccessToken } from "./access-token";
import { extractBearerToken } from "./request-user";

/**
 * Wraps every request that carries a valid access token in a transaction scoped to the
 * caller's user id (`runWithUserContext`), so any repository call made anywhere downstream --
 * including inside guards -- participates in Postgres RLS (SECURITY_MODEL.md §4,
 * ARCHITECTURE.md ADR-009). Registered as global middleware (`app.module.ts`), not an
 * interceptor: Nest's request lifecycle runs Middleware -> Guards -> Interceptors -> Handler,
 * so an interceptor-based approach can never make RLS context available to a guard (e.g.
 * `RolesGuard`'s own `project_members` lookup) -- only middleware runs early enough.
 *
 * Verification here is best-effort: an invalid/expired token simply means no RLS context is
 * established, not a rejected request -- `JwtAuthGuard` is the one guard responsible for
 * actually rejecting unauthenticated access to protected routes.
 */
@Injectable()
export class RlsContextMiddleware implements NestMiddleware {
  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService<EnvConfig, true>,
  ) {}

  async use(request: Request, response: Response, next: NextFunction): Promise<void> {
    const token = extractBearerToken(request);
    if (!token) {
      next();
      return;
    }

    const user = await verifyAccessToken(token, this.jwtService, this.configService);
    if (!user) {
      next();
      return;
    }
    request.user = user;

    try {
      await runWithUserContext(user.sub, () =>
        new Promise<void>((resolve, reject) => {
          response.once("finish", resolve);
          response.once("close", resolve);
          try {
            next();
          } catch (error) {
            reject(error instanceof Error ? error : new Error(String(error)));
          }
        }),
      );
    } catch {
      // The downstream pipeline already handled/reported its own errors via the exception
      // filter; nothing further to do here once the wrapped promise settles.
    }
  }
}
