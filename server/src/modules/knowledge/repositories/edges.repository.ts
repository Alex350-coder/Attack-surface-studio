import { and, eq, isNull, sql } from "drizzle-orm";
import type { Database } from "../../../core/database/client";
import { edges } from "../../../core/database/schema";
import {
  extractTotal,
  normalizePagination,
  type Paginated,
  type PaginationParams,
} from "../../shared/repository.types";

export interface EdgeRow {
  id: string;
  projectId: string;
  sourceId: string;
  targetId: string;
  type: string;
  animated: boolean;
  label: string | null;
  data: Record<string, unknown>;
  sourceRunId: string | null;
  createdAt: Date;
  deletedAt: Date | null;
}

export interface EdgeUpsertInput {
  sourceId: string;
  targetId: string;
  type: string;
  animated?: boolean;
  label?: string | null;
  data?: Record<string, unknown>;
  sourceRunId?: string | null;
}

export interface EdgeListFilters {
  sourceId?: string;
  targetId?: string;
  type?: string;
}

/**
 * All data access for the `edges` table. Every method is project-scoped (DB-013, SEC-012).
 */
export interface EdgesRepository {
  /**
   * Idempotent upsert keyed on (project_id, source_id, target_id, type) (DB-011, DB-012).
   */
  upsertMany(projectId: string, inputs: EdgeUpsertInput[]): Promise<EdgeRow[]>;
  findById(projectId: string, id: string): Promise<EdgeRow | null>;
  listByProject(
    projectId: string,
    filters?: EdgeListFilters,
    pagination?: PaginationParams,
  ): Promise<Paginated<EdgeRow>>;
  softDelete(projectId: string, id: string): Promise<void>;
}

export class DrizzleEdgesRepository implements EdgesRepository {
  constructor(private readonly db: Database) {}

  /**
   * Single batched multi-row statement (PERF-006) — never a per-row loop. See the equivalent
   * note in nodes.repository.ts for why `excluded` is used instead of per-input JS literals.
   */
  async upsertMany(projectId: string, inputs: EdgeUpsertInput[]): Promise<EdgeRow[]> {
    if (inputs.length === 0) return [];

    const rows = await this.db
      .insert(edges)
      .values(
        inputs.map((input) => ({
          projectId,
          sourceId: input.sourceId,
          targetId: input.targetId,
          type: input.type,
          animated: input.animated ?? false,
          label: input.label ?? null,
          data: input.data ?? {},
          sourceRunId: input.sourceRunId ?? null,
        })),
      )
      .onConflictDoUpdate({
        target: [edges.projectId, edges.sourceId, edges.targetId, edges.type],
        set: {
          animated: sql`excluded.animated`,
          label: sql`excluded.label`,
          data: sql`${edges.data} || excluded.data`,
          sourceRunId: sql`excluded.source_run_id`,
          deletedAt: null,
        },
      })
      .returning();

    return rows as EdgeRow[];
  }

  async findById(projectId: string, id: string): Promise<EdgeRow | null> {
    const [row] = await this.db
      .select()
      .from(edges)
      .where(and(eq(edges.projectId, projectId), eq(edges.id, id), isNull(edges.deletedAt)))
      .limit(1);
    return (row as EdgeRow) ?? null;
  }

  async listByProject(
    projectId: string,
    filters: EdgeListFilters = {},
    pagination?: PaginationParams,
  ): Promise<Paginated<EdgeRow>> {
    const { page, pageSize, offset } = normalizePagination(pagination);
    const conditions = [eq(edges.projectId, projectId), isNull(edges.deletedAt)];
    if (filters.sourceId) conditions.push(eq(edges.sourceId, filters.sourceId));
    if (filters.targetId) conditions.push(eq(edges.targetId, filters.targetId));
    if (filters.type) conditions.push(eq(edges.type, filters.type));
    const where = and(...conditions);

    const [items, countRows] = await Promise.all([
      this.db.select().from(edges).where(where).limit(pageSize).offset(offset),
      this.db.select({ count: sql<number>`count(*)::int` }).from(edges).where(where),
    ]);

    return { items: items as EdgeRow[], page, pageSize, total: extractTotal(countRows) };
  }

  async softDelete(projectId: string, id: string): Promise<void> {
    await this.db
      .update(edges)
      .set({ deletedAt: sql`now()` })
      .where(and(eq(edges.projectId, projectId), eq(edges.id, id)));
  }
}
