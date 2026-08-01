import { and, eq, isNull, sql } from "drizzle-orm";
import type { Database } from "../../../core/database/client";
import { nodes } from "../../../core/database/schema";
import {
  extractTotal,
  normalizePagination,
  type Paginated,
  type PaginationParams,
} from "../../shared/repository.types";

export interface NodeRow {
  id: string;
  projectId: string;
  type: string;
  category: string;
  identityKey: string;
  label: string;
  severity: string | null;
  data: Record<string, unknown>;
  sourceRunId: string | null;
  createdBy: string | null;
  createdAt: Date;
  updatedAt: Date;
  lastSeenAt: Date;
  deletedAt: Date | null;
}

export interface NodeUpsertInput {
  identityKey: string;
  type: string;
  category: string;
  label: string;
  severity?: string | null;
  data?: Record<string, unknown>;
  sourceRunId?: string | null;
  createdBy?: string | null;
}

export interface NodeListFilters {
  type?: string;
  category?: string;
}

/**
 * All data access for the `nodes` table. Every method is project-scoped (DB-013, SEC-012)
 * and every write goes through Drizzle's parameterized query builder (DB-016).
 */
export interface NodesRepository {
  /**
   * Idempotent upsert keyed on (project_id, identity_key) (DB-011, DB-012). Re-ingesting the
   * same identity merges `data` and bumps `last_seen_at` instead of creating a duplicate.
   */
  upsertMany(projectId: string, inputs: NodeUpsertInput[]): Promise<NodeRow[]>;
  findById(projectId: string, id: string): Promise<NodeRow | null>;
  findByIdentityKey(projectId: string, identityKey: string): Promise<NodeRow | null>;
  listByProject(
    projectId: string,
    filters?: NodeListFilters,
    pagination?: PaginationParams,
  ): Promise<Paginated<NodeRow>>;
  softDelete(projectId: string, id: string): Promise<void>;
}

export class DrizzleNodesRepository implements NodesRepository {
  constructor(private readonly db: Database) {}

  /**
   * Single batched multi-row statement (PERF-006) — never a per-row loop. The jsonb merge and
   * touched columns reference Postgres's `excluded` pseudo-table, so each conflicting row merges
   * against its own incoming values in one round trip.
   */
  async upsertMany(projectId: string, inputs: NodeUpsertInput[]): Promise<NodeRow[]> {
    if (inputs.length === 0) return [];

    const rows = await this.db
      .insert(nodes)
      .values(
        inputs.map((input) => ({
          projectId,
          type: input.type,
          category: input.category,
          identityKey: input.identityKey,
          label: input.label,
          severity: input.severity ?? null,
          data: input.data ?? {},
          sourceRunId: input.sourceRunId ?? null,
          createdBy: input.createdBy ?? null,
        })),
      )
      .onConflictDoUpdate({
        target: [nodes.projectId, nodes.identityKey],
        set: {
          label: sql`excluded.label`,
          severity: sql`excluded.severity`,
          data: sql`${nodes.data} || excluded.data`,
          sourceRunId: sql`excluded.source_run_id`,
          updatedAt: sql`now()`,
          lastSeenAt: sql`now()`,
          deletedAt: null,
        },
      })
      .returning();

    return rows as NodeRow[];
  }

  async findById(projectId: string, id: string): Promise<NodeRow | null> {
    const [row] = await this.db
      .select()
      .from(nodes)
      .where(and(eq(nodes.projectId, projectId), eq(nodes.id, id), isNull(nodes.deletedAt)))
      .limit(1);
    return (row as NodeRow) ?? null;
  }

  async findByIdentityKey(projectId: string, identityKey: string): Promise<NodeRow | null> {
    const [row] = await this.db
      .select()
      .from(nodes)
      .where(
        and(eq(nodes.projectId, projectId), eq(nodes.identityKey, identityKey), isNull(nodes.deletedAt)),
      )
      .limit(1);
    return (row as NodeRow) ?? null;
  }

  async listByProject(
    projectId: string,
    filters: NodeListFilters = {},
    pagination?: PaginationParams,
  ): Promise<Paginated<NodeRow>> {
    const { page, pageSize, offset } = normalizePagination(pagination);
    const conditions = [eq(nodes.projectId, projectId), isNull(nodes.deletedAt)];
    if (filters.type) conditions.push(eq(nodes.type, filters.type));
    if (filters.category) conditions.push(eq(nodes.category, filters.category));
    const where = and(...conditions);

    const [items, countRows] = await Promise.all([
      this.db.select().from(nodes).where(where).limit(pageSize).offset(offset),
      this.db.select({ count: sql<number>`count(*)::int` }).from(nodes).where(where),
    ]);

    return { items: items as NodeRow[], page, pageSize, total: extractTotal(countRows) };
  }

  async softDelete(projectId: string, id: string): Promise<void> {
    await this.db
      .update(nodes)
      .set({ deletedAt: sql`now()` })
      .where(and(eq(nodes.projectId, projectId), eq(nodes.id, id)));
  }
}
