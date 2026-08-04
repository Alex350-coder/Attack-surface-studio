import { eq, sql } from "drizzle-orm";
import type { Database } from "../../../core/database/client";
import { sessions } from "../../../core/database/schema";

export interface SessionRow {
  id: string;
  userId: string;
  refreshTokenHash: string;
  replacedBySessionId: string | null;
  revokedAt: Date | null;
  expiresAt: Date;
  createdAt: Date;
}

export interface SessionCreateInput {
  userId: string;
  refreshTokenHash: string;
  expiresAt: Date;
}

/**
 * All data access for the `sessions` table -- the refresh-token rotation chain that
 * `AuthService` uses to detect reuse and revoke compromised chains (SEC-004, OWA-020).
 */
export interface SessionsRepository {
  create(input: SessionCreateInput): Promise<SessionRow>;
  findById(id: string): Promise<SessionRow | null>;
  findByRefreshTokenHash(refreshTokenHash: string): Promise<SessionRow | null>;
  markRotated(id: string, replacedBySessionId: string): Promise<void>;
  revoke(id: string): Promise<void>;
  /** Revokes the given session and walks forward through `replacedBySessionId` revoking every descendant. */
  revokeChainFrom(id: string): Promise<void>;
}

export class DrizzleSessionsRepository implements SessionsRepository {
  constructor(private readonly db: Database) {}

  async create(input: SessionCreateInput): Promise<SessionRow> {
    const [row] = await this.db
      .insert(sessions)
      .values({
        userId: input.userId,
        refreshTokenHash: input.refreshTokenHash,
        expiresAt: input.expiresAt,
      })
      .returning();
    return row as SessionRow;
  }

  async findById(id: string): Promise<SessionRow | null> {
    const [row] = await this.db.select().from(sessions).where(eq(sessions.id, id)).limit(1);
    return (row as SessionRow) ?? null;
  }

  async findByRefreshTokenHash(refreshTokenHash: string): Promise<SessionRow | null> {
    const [row] = await this.db.select().from(sessions).where(eq(sessions.refreshTokenHash, refreshTokenHash)).limit(1);
    return (row as SessionRow) ?? null;
  }

  async markRotated(id: string, replacedBySessionId: string): Promise<void> {
    await this.db
      .update(sessions)
      .set({ revokedAt: sql`now()`, replacedBySessionId })
      .where(eq(sessions.id, id));
  }

  async revoke(id: string): Promise<void> {
    await this.db
      .update(sessions)
      .set({ revokedAt: sql`now()` })
      .where(eq(sessions.id, id));
  }

  async revokeChainFrom(id: string): Promise<void> {
    let current = await this.findById(id);
    const visited = new Set<string>();

    while (current && !visited.has(current.id)) {
      visited.add(current.id);
      if (!current.revokedAt) {
        await this.revoke(current.id);
      }
      current = current.replacedBySessionId ? await this.findById(current.replacedBySessionId) : null;
    }
  }
}
