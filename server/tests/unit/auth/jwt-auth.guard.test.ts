import { describe, expect, it } from "vitest";
import { JwtService } from "@nestjs/jwt";
import type { ExecutionContext } from "@nestjs/common";
import type { ConfigService } from "@nestjs/config";
import { JwtAuthGuard } from "../../../src/modules/auth/guards/jwt-auth.guard";
import { UnauthorizedError } from "../../../src/core/http/domain-error";
import type { EnvConfig } from "../../../src/core/config/env.schema";

const SECRET = "a".repeat(32);

function makeConfigService(): ConfigService<EnvConfig, true> {
  return { get: () => SECRET } as unknown as ConfigService<EnvConfig, true>;
}

function makeContext(authorization?: string): ExecutionContext {
  const request = { headers: { authorization }, user: undefined as unknown };
  return {
    switchToHttp: () => ({ getRequest: () => request }),
  } as unknown as ExecutionContext;
}

describe("JwtAuthGuard", () => {
  const jwtService = new JwtService({});
  const guard = new JwtAuthGuard(jwtService, makeConfigService());

  it("rejects a request with no Authorization header", async () => {
    await expect(guard.canActivate(makeContext(undefined))).rejects.toThrow(UnauthorizedError);
  });

  it("rejects a malformed Authorization header", async () => {
    await expect(guard.canActivate(makeContext("Token abc"))).rejects.toThrow(UnauthorizedError);
  });

  it("rejects an invalid access token", async () => {
    await expect(guard.canActivate(makeContext("Bearer not-a-real-token"))).rejects.toThrow(UnauthorizedError);
  });

  it("rejects an expired access token", async () => {
    const token = await jwtService.signAsync({ sub: "u1", email: "a@example.com" }, { secret: SECRET, expiresIn: "-1s" });
    await expect(guard.canActivate(makeContext(`Bearer ${token}`))).rejects.toThrow(UnauthorizedError);
  });

  it("accepts a valid access token and populates request.user", async () => {
    const token = await jwtService.signAsync({ sub: "u1", email: "a@example.com" }, { secret: SECRET, expiresIn: "5m" });
    const context = makeContext(`Bearer ${token}`);

    const result = await guard.canActivate(context);

    expect(result).toBe(true);
    const request = context.switchToHttp().getRequest<{ user?: { sub: string; email: string } }>();
    expect(request.user).toEqual({ sub: "u1", email: "a@example.com" });
  });
});
