import { randomBytes, createHash } from "node:crypto";
import { Inject, Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import * as argon2 from "argon2";
import type { EnvConfig } from "../../core/config/env.schema";
import { ConflictError, UnauthorizedError } from "../../core/http/domain-error";
import { USERS_REPOSITORY } from "../users/users.tokens";
import type { UserRow, UsersRepository } from "../users/repositories/users.repository";
import { SESSIONS_REPOSITORY } from "./auth.tokens";
import type { SessionRow, SessionsRepository } from "./repositories/sessions.repository";
import { ttlToMs } from "./ttl";
import type { RegisterDto, LoginDto } from "./dto/auth.dto";

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

export interface AuthenticatedUser {
  id: string;
  email: string;
  displayName: string | null;
}

export interface AuthResult {
  user: AuthenticatedUser;
  tokens: TokenPair;
}

@Injectable()
export class AuthService {
  constructor(
    @Inject(USERS_REPOSITORY) private readonly usersRepository: UsersRepository,
    @Inject(SESSIONS_REPOSITORY) private readonly sessionsRepository: SessionsRepository,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService<EnvConfig, true>,
  ) {}

  async register(input: RegisterDto): Promise<AuthResult> {
    const existing = await this.usersRepository.findByEmail(input.email);
    if (existing) {
      throw new ConflictError("An account with this email already exists");
    }

    const passwordHash = await argon2.hash(input.password, { type: argon2.argon2id });
    const user = await this.usersRepository.create({
      email: input.email,
      passwordHash,
      displayName: input.displayName ?? null,
    });

    const { tokens } = await this.issueTokenPair(user);
    return { user: this.toAuthenticatedUser(user), tokens };
  }

  async login(input: LoginDto): Promise<AuthResult> {
    const user = await this.usersRepository.findByEmail(input.email);
    if (!user) {
      // Verify against a dummy hash anyway so login timing doesn't reveal whether the email exists.
      await argon2.hash(input.password, { type: argon2.argon2id }).catch(() => undefined);
      throw new UnauthorizedError("Invalid email or password");
    }

    const isValidPassword = await argon2.verify(user.passwordHash, input.password);
    if (!isValidPassword) {
      throw new UnauthorizedError("Invalid email or password");
    }

    const { tokens } = await this.issueTokenPair(user);
    return { user: this.toAuthenticatedUser(user), tokens };
  }

  async refresh(refreshToken: string): Promise<TokenPair> {
    const refreshTokenHash = this.hashRefreshToken(refreshToken);
    const session = await this.sessionsRepository.findByRefreshTokenHash(refreshTokenHash);

    if (!session) {
      throw new UnauthorizedError("Invalid refresh token");
    }

    if (session.revokedAt || session.expiresAt.getTime() < Date.now()) {
      // A revoked or expired refresh token was replayed -- treat as reuse of a stolen/rotated
      // token and revoke the whole rotation chain so a previously-issued descendant token
      // (if one exists) also stops working (SEC-004, OWA-020).
      await this.sessionsRepository.revokeChainFrom(session.id);
      throw new UnauthorizedError("Refresh token has already been used or has expired");
    }

    const user = await this.usersRepository.findById(session.userId);
    if (!user) {
      throw new UnauthorizedError("Invalid refresh token");
    }

    const { tokens, session: newSession } = await this.issueTokenPair(user);
    await this.sessionsRepository.markRotated(session.id, newSession.id);

    return tokens;
  }

  async logout(refreshToken: string): Promise<void> {
    const refreshTokenHash = this.hashRefreshToken(refreshToken);
    const session = await this.sessionsRepository.findByRefreshTokenHash(refreshTokenHash);
    if (session && !session.revokedAt) {
      await this.sessionsRepository.revoke(session.id);
    }
  }

  async getById(userId: string): Promise<AuthenticatedUser | null> {
    const user = await this.usersRepository.findById(userId);
    return user ? this.toAuthenticatedUser(user) : null;
  }

  private async issueTokenPair(user: UserRow): Promise<{ tokens: TokenPair; session: SessionRow }> {
    const accessToken = await this.jwtService.signAsync(
      { sub: user.id, email: user.email },
      {
        secret: this.configService.get("JWT_ACCESS_SECRET", { infer: true }),
        expiresIn: this.configService.get("JWT_ACCESS_TTL", { infer: true }),
      },
    );

    const refreshToken = randomBytes(32).toString("hex");
    const refreshTtl = this.configService.get("JWT_REFRESH_TTL", { infer: true });
    const session = await this.sessionsRepository.create({
      userId: user.id,
      refreshTokenHash: this.hashRefreshToken(refreshToken),
      expiresAt: new Date(Date.now() + ttlToMs(refreshTtl)),
    });

    return { tokens: { accessToken, refreshToken }, session };
  }

  private hashRefreshToken(refreshToken: string): string {
    // Refresh tokens are 256 bits of CSPRNG output (not user-chosen secrets), so a fast
    // deterministic digest is sufficient for lookup -- unlike passwords, they don't need a
    // slow, salted KDF (SEC-002).
    return createHash("sha256").update(refreshToken).digest("hex");
  }

  private toAuthenticatedUser(user: UserRow): AuthenticatedUser {
    return { id: user.id, email: user.email, displayName: user.displayName };
  }
}
