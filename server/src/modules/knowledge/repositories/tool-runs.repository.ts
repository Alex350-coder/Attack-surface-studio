import { and, eq, inArray, sql } from "drizzle-orm";
import type { Database } from "../../../core/database/client";
import { toolRuns } from "../../../core/database/schema";
import {
  extractTotal,
  normalizePagination,
  type Paginated,
  type PaginationParams,
} from "../../shared/repository.types";
import { canTransition, TOOL_RUN_STATUSES, type ToolRunStatus } from "../../orchestrator/tool-run-transitions";

function isToolRunStatus(value: string): value is ToolRunStatus {
  return (TOOL_RUN_STATUSES as readonly string[]).includes(value);
}

export interface ToolRunRow {
  id: string;
  projectId: string;
  adapterId: string;
  executionMode: string;
  target: string;
  invocation: unknown;
  status: string;
  queuedAt: Date;
  startedAt: Date | null;
  finishedAt: Date | null;
  triggeredBy: string;
  stats: unknown;
  error: unknown;
  createdAt: Date;
}

export interface ToolRunCreateInput {
  adapterId: string;
  executionMode: string;
  target: string;
  triggeredBy: string;
  status?: string;
}

export interface ToolRunStatusUpdate {
  status: string;
  startedAt?: Date | null;
  finishedAt?: Date | null;
  invocation?: unknown;
  stats?: unknown;
  error?: unknown;
}

/** All data access for the `tool_runs` table. Every method is project-scoped (DB-013, SEC-012). */
export interface ToolRunsRepository {
  create(projectId: string, input: ToolRunCreateInput): Promise<ToolRunRow>;
  findById(projectId: string, id: string): Promise<ToolRunRow | null>;
  /**
   * `expectedCurrentStatuses`, when given, makes this an atomic conditional update (OWA-020):
   * the row is only written if its current status is still one of the given values, so a
   * worker's terminal write can never clobber a concurrent cancellation (or vice versa). No
   * match (already transitioned) resolves to `null`, not an error -- the caller decides whether
   * that's expected.
   */
  updateStatus(
    projectId: string,
    id: string,
    update: ToolRunStatusUpdate,
    expectedCurrentStatuses?: string[],
  ): Promise<ToolRunRow | null>;
  listByProject(projectId: string, pagination?: PaginationParams): Promise<Paginated<ToolRunRow>>;
}

export class DrizzleToolRunsRepository implements ToolRunsRepository {
  constructor(private readonly db: Database) {}

  async create(projectId: string, input: ToolRunCreateInput): Promise<ToolRunRow> {
    const [row] = await this.db
      .insert(toolRuns)
      .values({
        projectId,
        adapterId: input.adapterId,
        executionMode: input.executionMode,
        target: input.target,
        triggeredBy: input.triggeredBy,
        status: input.status ?? "queued",
      })
      .returning();
    return row as ToolRunRow;
  }

  async findById(projectId: string, id: string): Promise<ToolRunRow | null> {
    const [row] = await this.db
      .select()
      .from(toolRuns)
      .where(and(eq(toolRuns.projectId, projectId), eq(toolRuns.id, id)))
      .limit(1);
    return (row as ToolRunRow) ?? null;
  }

  async updateStatus(
    projectId: string,
    id: string,
    update: ToolRunStatusUpdate,
    expectedCurrentStatuses?: string[],
  ): Promise<ToolRunRow | null> {
    // Defense-in-depth (OWA-021): every caller-declared "from" status must actually be allowed
    // to reach the target status per the state machine in `tool-run-transitions.ts`, catching a
    // call site drifting out of sync with the allow-list before it reaches the database.
    if (isToolRunStatus(update.status) && expectedCurrentStatuses) {
      for (const from of expectedCurrentStatuses) {
        if (isToolRunStatus(from) && !canTransition(from, update.status)) {
          throw new Error(`Illegal tool_run transition: ${from} -> ${update.status}`);
        }
      }
    }

    const conditions = [eq(toolRuns.projectId, projectId), eq(toolRuns.id, id)];
    if (expectedCurrentStatuses && expectedCurrentStatuses.length > 0) {
      conditions.push(inArray(toolRuns.status, expectedCurrentStatuses));
    }

    const [row] = await this.db
      .update(toolRuns)
      .set({
        status: update.status,
        startedAt: update.startedAt,
        finishedAt: update.finishedAt,
        ...(update.invocation !== undefined ? { invocation: update.invocation } : {}),
        ...(update.stats !== undefined ? { stats: update.stats } : {}),
        ...(update.error !== undefined ? { error: update.error } : {}),
      })
      .where(and(...conditions))
      .returning();
    return (row as ToolRunRow) ?? null;
  }

  async listByProject(
    projectId: string,
    pagination?: PaginationParams,
  ): Promise<Paginated<ToolRunRow>> {
    const { page, pageSize, offset } = normalizePagination(pagination);
    const where = eq(toolRuns.projectId, projectId);

    const [items, countRows] = await Promise.all([
      this.db.select().from(toolRuns).where(where).limit(pageSize).offset(offset),
      this.db.select({ count: sql<number>`count(*)::int` }).from(toolRuns).where(where),
    ]);

    return { items, page, pageSize, total: extractTotal(countRows) };
  }
}
