import { and, eq, sql } from "drizzle-orm";
import type { Database } from "../../../core/database/client";
import { toolRuns } from "../../../core/database/schema";
import {
  extractTotal,
  normalizePagination,
  type Paginated,
  type PaginationParams,
} from "../../shared/repository.types";

export interface ToolRunRow {
  id: string;
  projectId: string;
  adapterId: string;
  executionMode: string;
  status: string;
  startedAt: Date | null;
  finishedAt: Date | null;
  createdAt: Date;
}

export interface ToolRunCreateInput {
  adapterId: string;
  executionMode: string;
  status?: string;
}

export interface ToolRunStatusUpdate {
  status: string;
  startedAt?: Date | null;
  finishedAt?: Date | null;
}

/** All data access for the `tool_runs` table. Every method is project-scoped (DB-013, SEC-012). */
export interface ToolRunsRepository {
  create(projectId: string, input: ToolRunCreateInput): Promise<ToolRunRow>;
  findById(projectId: string, id: string): Promise<ToolRunRow | null>;
  updateStatus(projectId: string, id: string, update: ToolRunStatusUpdate): Promise<ToolRunRow | null>;
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
  ): Promise<ToolRunRow | null> {
    const [row] = await this.db
      .update(toolRuns)
      .set({
        status: update.status,
        startedAt: update.startedAt,
        finishedAt: update.finishedAt,
      })
      .where(and(eq(toolRuns.projectId, projectId), eq(toolRuns.id, id)))
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
