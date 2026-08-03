import { and, eq, isNull, sql } from "drizzle-orm";
import type { Database } from "../../../core/database/client";
import { users } from "../../../core/database/schema";
import {
  extractTotal,
  normalizePagination,
  type Paginated,
  type PaginationParams,
} from "../../shared/repository.types";

export interface UserRow {
  id: string;
  email: string;
  passwordHash: string;
  displayName: string | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

export interface UserCreateInput {
  email: string;
  passwordHash: string;
  displayName?: string | null;
}

/**
 * All data access for the `users` table. Callers outside this repository never see
 * `passwordHash` beyond what's needed for auth comparison (Phase 4 auth module boundary).
 */
export interface UsersRepository {
  create(input: UserCreateInput): Promise<UserRow>;
  findById(id: string): Promise<UserRow | null>;
  findByEmail(email: string): Promise<UserRow | null>;
  list(pagination?: PaginationParams): Promise<Paginated<UserRow>>;
  softDelete(id: string): Promise<void>;
}

export class DrizzleUsersRepository implements UsersRepository {
  constructor(private readonly db: Database) {}

  async create(input: UserCreateInput): Promise<UserRow> {
    const [row] = await this.db
      .insert(users)
      .values({
        email: input.email,
        passwordHash: input.passwordHash,
        displayName: input.displayName ?? null,
      })
      .returning();
    return row as UserRow;
  }

  async findById(id: string): Promise<UserRow | null> {
    const [row] = await this.db
      .select()
      .from(users)
      .where(and(eq(users.id, id), isNull(users.deletedAt)))
      .limit(1);
    return (row as UserRow) ?? null;
  }

  async findByEmail(email: string): Promise<UserRow | null> {
    const [row] = await this.db
      .select()
      .from(users)
      .where(and(eq(users.email, email), isNull(users.deletedAt)))
      .limit(1);
    return (row as UserRow) ?? null;
  }

  async list(pagination?: PaginationParams): Promise<Paginated<UserRow>> {
    const { page, pageSize, offset } = normalizePagination(pagination);
    const where = isNull(users.deletedAt);

    const [items, countRows] = await Promise.all([
      this.db.select().from(users).where(where).limit(pageSize).offset(offset),
      this.db.select({ count: sql<number>`count(*)::int` }).from(users).where(where),
    ]);

    return { items, page, pageSize, total: extractTotal(countRows) };
  }

  async softDelete(id: string): Promise<void> {
    await this.db
      .update(users)
      .set({ deletedAt: sql`now()` })
      .where(eq(users.id, id));
  }
}
