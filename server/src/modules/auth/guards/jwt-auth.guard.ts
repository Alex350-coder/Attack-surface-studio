import { CanActivate, ExecutionContext, Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import type { Request } from "express";
import type { EnvConfig } from "../../../core/config/env.schema";
import { UnauthorizedError } from "../../../core/http/domain-error";
import { extractBearerToken } from "../../../core/http/request-user";
import { verifyAccessToken } from "../../../core/http/access-token";

/**
 * Validates the `Authorization: Bearer <accessToken>` header and populates `request.user`.
 * `request.user` may already be set by `RlsContextMiddleware` (which runs earlier, before
 * guards, so it can establish RLS context ahead of any guard's own repository queries) -- in
 * that case this guard just re-confirms it's present rather than verifying the token twice.
 */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService<EnvConfig, true>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    if (request.user) {
      return true;
    }

    const token = extractBearerToken(request);
    if (!token) {
      throw new UnauthorizedError("Missing or malformed Authorization header");
    }

    const user = await verifyAccessToken(token, this.jwtService, this.configService);
    if (!user) {
      throw new UnauthorizedError("Invalid or expired access token");
    }
    request.user = user;
    return true;
  }
}
