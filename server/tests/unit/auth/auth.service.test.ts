import { createHash } from "node:crypto";
import { beforeEach, describe, expect, it, vi, type Mocked } from "vitest";
import { JwtService } from "@nestjs/jwt";
import type { ConfigService } from "@nestjs/config";
import { AuthService } from "../../../src/modules/auth/auth.service";
import { ConflictError, UnauthorizedError } from "../../../src/core/http/domain-error";
import type { UsersRepository, UserRow } from "../../../src/modules/users/repositories/users.repository";
import type {
  SessionCreateInput,
  SessionRow,
  SessionsRepository,
} from "../../../src/modules/auth/repositories/sessions.repository";
import type { EnvConfig } from "../../../src/core/config/env.schema";

function makeConfigService(): ConfigService<EnvConfig, true> {
  const values: Record<string, unknown> = {
    JWT_ACCESS_SECRET: "a".repeat(32),
    JWT_ACCESS_TTL: "15m",
    JWT_REFRESH_TTL: "7d",
  };
  return { get: (key: string) => values[key] } as unknown as ConfigService<EnvConfig, true>;
}

function makeUser(overrides: Partial<UserRow> = {}): UserRow {
  return {
    id: "11111111-1111-1111-1111-111111111111",
    email: "user@example.com",
    passwordHash: "",
    displayName: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
    ...overrides,
  };
}

describe("AuthService", () => {
  let usersRepository: Mocked<UsersRepository>;
  let sessionsRepository: Mocked<SessionsRepository>;
  let service: AuthService;
  let sessionsStore: Map<string, SessionRow>;

  beforeEach(() => {
    sessionsStore = new Map();
    let sessionCounter = 0;

    usersRepository = {
      create: vi.fn(),
      findById: vi.fn(),
      findByEmail: vi.fn(),
      list: vi.fn(),
      softDelete: vi.fn(),
    };

    sessionsRepository = {
      create: vi.fn().mockImplementation((input: SessionCreateInput) => {
        sessionCounter += 1;
        const row: SessionRow = {
          id: `session-${sessionCounter}`,
          userId: input.userId,
          refreshTokenHash: input.refreshTokenHash,
          replacedBySessionId: null,
          revokedAt: null,
          expiresAt: input.expiresAt,
          createdAt: new Date(),
        };
        sessionsStore.set(row.id, row);
        return Promise.resolve(row);
      }),
      findById: vi.fn().mockImplementation((id: string) => Promise.resolve(sessionsStore.get(id) ?? null)),
      findByRefreshTokenHash: vi.fn().mockImplementation((hash: string) =>
        Promise.resolve([...sessionsStore.values()].find((s) => s.refreshTokenHash === hash) ?? null),
      ),
      markRotated: vi.fn().mockImplementation((id: string, replacedBySessionId: string) => {
        const row = sessionsStore.get(id);
        if (row) {
          row.revokedAt = new Date();
          row.replacedBySessionId = replacedBySessionId;
        }
        return Promise.resolve();
      }),
      revoke: vi.fn().mockImplementation((id: string) => {
        const row = sessionsStore.get(id);
        if (row) row.revokedAt = new Date();
        return Promise.resolve();
      }),
      revokeChainFrom: vi.fn().mockImplementation((id: string) => {
        let current = sessionsStore.get(id);
        const visited = new Set<string>();
        while (current && !visited.has(current.id)) {
          visited.add(current.id);
          current.revokedAt = current.revokedAt ?? new Date();
          current = current.replacedBySessionId ? sessionsStore.get(current.replacedBySessionId) : undefined;
        }
        return Promise.resolve();
      }),
    };

    service = new AuthService(usersRepository, sessionsRepository, new JwtService({}), makeConfigService());
  });

  it("registers a new user with an Argon2id password hash, never storing the raw password", async () => {
    usersRepository.findByEmail.mockResolvedValue(null);
    usersRepository.create.mockImplementation((input) => Promise.resolve(makeUser({ ...input, id: "u1" })));

    const result = await service.register({ email: "new@example.com", password: "super-secret-password" });

    expect(usersRepository.create.mock.calls).toHaveLength(1);
    const createInput = usersRepository.create.mock.calls[0]?.[0];
    expect(createInput?.passwordHash).not.toBe("super-secret-password");
    expect(createInput?.passwordHash).toMatch(/^\$argon2id\$/);
    expect(result.tokens.accessToken).toEqual(expect.any(String));
    expect(result.tokens.refreshToken).toEqual(expect.any(String));
  });

  it("rejects registration when the email is already taken", async () => {
    usersRepository.findByEmail.mockResolvedValue(makeUser());

    await expect(service.register({ email: "user@example.com", password: "super-secret-password" })).rejects.toThrow(
      ConflictError,
    );
  });

  it("logs in with correct credentials and issues a token pair", async () => {
    const argon2 = await import("argon2");
    const passwordHash = await argon2.hash("correct-password", { type: argon2.argon2id });
    usersRepository.findByEmail.mockResolvedValue(makeUser({ passwordHash }));

    const result = await service.login({ email: "user@example.com", password: "correct-password" });

    expect(result.tokens.accessToken).toEqual(expect.any(String));
  });

  it("rejects login with an incorrect password without revealing which field was wrong", async () => {
    const argon2 = await import("argon2");
    const passwordHash = await argon2.hash("correct-password", { type: argon2.argon2id });
    usersRepository.findByEmail.mockResolvedValue(makeUser({ passwordHash }));

    await expect(service.login({ email: "user@example.com", password: "wrong-password" })).rejects.toThrow(
      UnauthorizedError,
    );
  });

  it("rejects login for a non-existent user with the same error as a wrong password", async () => {
    usersRepository.findByEmail.mockResolvedValue(null);

    await expect(service.login({ email: "nobody@example.com", password: "whatever" })).rejects.toThrow(
      UnauthorizedError,
    );
  });

  it("rotates the refresh token on refresh, revoking the old session", async () => {
    usersRepository.findByEmail.mockResolvedValue(null);
    usersRepository.create.mockImplementation((input) => Promise.resolve(makeUser({ ...input, id: "u1" })));
    usersRepository.findById.mockResolvedValue(makeUser({ id: "u1" }));

    const { tokens } = await service.register({ email: "new@example.com", password: "super-secret-password" });
    const originalSession = [...sessionsStore.values()][0];

    const rotated = await service.refresh(tokens.refreshToken);

    expect(rotated.refreshToken).not.toBe(tokens.refreshToken);
    expect(originalSession?.revokedAt).not.toBeNull();
  });

  it("detects reuse of an already-rotated refresh token and revokes the chain", async () => {
    usersRepository.findByEmail.mockResolvedValue(null);
    usersRepository.create.mockImplementation((input) => Promise.resolve(makeUser({ ...input, id: "u1" })));
    usersRepository.findById.mockResolvedValue(makeUser({ id: "u1" }));

    const { tokens } = await service.register({ email: "new@example.com", password: "super-secret-password" });
    const rotated = await service.refresh(tokens.refreshToken);

    // Replaying the original (now-rotated) refresh token must fail and revoke the descendant too.
    await expect(service.refresh(tokens.refreshToken)).rejects.toThrow(UnauthorizedError);

    const rotatedSession = [...sessionsStore.values()].find((s) => s.refreshTokenHash === hashToken(rotated.refreshToken));
    expect(rotatedSession?.revokedAt).not.toBeNull();
  });

  it("rejects refresh with an unknown token", async () => {
    await expect(service.refresh("not-a-real-token")).rejects.toThrow(UnauthorizedError);
  });

  it("revokes the session on logout so the refresh token can no longer be used", async () => {
    usersRepository.findByEmail.mockResolvedValue(null);
    usersRepository.create.mockImplementation((input) => Promise.resolve(makeUser({ ...input, id: "u1" })));

    const { tokens } = await service.register({ email: "new@example.com", password: "super-secret-password" });
    await service.logout(tokens.refreshToken);

    await expect(service.refresh(tokens.refreshToken)).rejects.toThrow(UnauthorizedError);
  });
});

/** Mirrors AuthService's private hashRefreshToken (sha256) so the test can locate the rotated session row. */
function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}
