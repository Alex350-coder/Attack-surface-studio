import { describe, expect, it, vi } from "vitest";
import { Reflector } from "@nestjs/core";
import type { ExecutionContext } from "@nestjs/common";
import { RolesGuard } from "../../../src/modules/auth/guards/roles.guard";
import { ForbiddenError, UnauthorizedError } from "../../../src/core/http/domain-error";
import type { ProjectMembersRepository } from "../../../src/modules/projects/repositories/project-members.repository";

function makeContext(options: { userId?: string; projectId?: string }): ExecutionContext {
  const request = {
    user: options.userId ? { sub: options.userId, email: "u@example.com" } : undefined,
    params: options.projectId ? { projectId: options.projectId } : {},
  };
  return {
    switchToHttp: () => ({ getRequest: () => request }),
    getHandler: () => undefined,
    getClass: () => undefined,
  } as unknown as ExecutionContext;
}

function makeReflector(roles: string[] | undefined): Reflector {
  return { getAllAndOverride: () => roles } as unknown as Reflector;
}

describe("RolesGuard", () => {
  it("allows any request through when no roles are required", async () => {
    const findByProjectAndUser = vi.fn();
    const repository = { findByProjectAndUser } as unknown as ProjectMembersRepository;
    const guard = new RolesGuard(makeReflector(undefined), repository);

    await expect(guard.canActivate(makeContext({}))).resolves.toBe(true);
    expect(findByProjectAndUser).not.toHaveBeenCalled();
  });

  it("rejects unauthenticated requests when roles are required", async () => {
    const repository = { findByProjectAndUser: vi.fn() } as unknown as ProjectMembersRepository;
    const guard = new RolesGuard(makeReflector(["admin"]), repository);

    await expect(guard.canActivate(makeContext({ projectId: "p1" }))).rejects.toThrow(UnauthorizedError);
  });

  it("rejects (403) when the user is not a member of the project", async () => {
    const repository = { findByProjectAndUser: vi.fn().mockResolvedValue(null) } as unknown as ProjectMembersRepository;
    const guard = new RolesGuard(makeReflector(["admin"]), repository);

    await expect(guard.canActivate(makeContext({ userId: "u1", projectId: "p1" }))).rejects.toThrow(ForbiddenError);
  });

  it("rejects (403) a viewer calling an admin-only route", async () => {
    const repository = {
      findByProjectAndUser: vi.fn().mockResolvedValue({ id: "m1", projectId: "p1", userId: "u1", role: "viewer", createdAt: new Date() }),
    } as unknown as ProjectMembersRepository;
    const guard = new RolesGuard(makeReflector(["admin", "owner"]), repository);

    await expect(guard.canActivate(makeContext({ userId: "u1", projectId: "p1" }))).rejects.toThrow(ForbiddenError);
  });

  it("allows a member whose role satisfies the requirement", async () => {
    const repository = {
      findByProjectAndUser: vi.fn().mockResolvedValue({ id: "m1", projectId: "p1", userId: "u1", role: "admin", createdAt: new Date() }),
    } as unknown as ProjectMembersRepository;
    const guard = new RolesGuard(makeReflector(["admin", "owner"]), repository);

    await expect(guard.canActivate(makeContext({ userId: "u1", projectId: "p1" }))).resolves.toBe(true);
  });
});
