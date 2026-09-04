import { and, eq, inArray, isNull, sql } from "drizzle-orm";
import type { Database } from "../../../core/database/client";
import { reports } from "../../../core/database/schema";
import {
  extractTotal,
  normalizePagination,
  type Paginated,
  type PaginationParams,
} from "../../shared/repository.types";

export interface ReportRow {
  id: string;
  projectId: string;
  title: string;
  status: string;
  graphSnapshot: Record<string, unknown>;
  contentRef: string | null;
  generatedBy: string | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

export interface ReportCreateInput {
  title: string;
  status?: string;
  graphSnapshot?: Record<string, unknown>;
  contentRef?: string | null;
  generatedBy?: string | null;
}

export interface ReportStatusUpdate {
  status: string;
  contentRef?: string | null;
}

export interface ReportStatusTransition {
  from: readonly string[];
  to: string;
}

/** All data access for the `reports` table. Every method is project-scoped (DB-013, SEC-012). */
export interface ReportsRepository {
  create(projectId: string, input: ReportCreateInput): Promise<ReportRow>;
  updateStatus(projectId: string, id: string, update: ReportStatusUpdate): Promise<ReportRow | null>;
  /**
   * Atomically moves a report from one of `from` to `to` in a single conditional UPDATE
   * (OWA-020: report finalization is concurrency-sensitive). Returns null -- never throws -- when
   * no row matched (already transitioned by a concurrent request, wrong project, or missing),
   * so the caller can map that to a 409 conflict instead of silently overwriting.
   */
  transitionStatus(
    projectId: string,
    id: string,
    transition: ReportStatusTransition,
  ): Promise<ReportRow | null>;
  findById(projectId: string, id: string): Promise<ReportRow | null>;
  listByProject(projectId: string, pagination?: PaginationParams): Promise<Paginated<ReportRow>>;
  softDelete(projectId: string, id: string): Promise<void>;
}

export class DrizzleReportsRepository implements ReportsRepository {
  constructor(private readonly db: Database) {}

  async create(projectId: string, input: ReportCreateInput): Promise<ReportRow> {
    const [row] = await this.db
      .insert(reports)
      .values({
        projectId,
        title: input.title,
        status: input.status ?? "draft",
        graphSnapshot: input.graphSnapshot ?? {},
        contentRef: input.contentRef ?? null,
        generatedBy: input.generatedBy ?? null,
      })
      .returning();
    return row as ReportRow;
  }

  async updateStatus(
    projectId: string,
    id: string,
    update: ReportStatusUpdate,
  ): Promise<ReportRow | null> {
    const [row] = await this.db
      .update(reports)
      .set({ status: update.status, contentRef: update.contentRef, updatedAt: sql`now()` })
      .where(and(eq(reports.projectId, projectId), eq(reports.id, id)))
      .returning();
    return (row as ReportRow) ?? null;
  }

  async transitionStatus(
    projectId: string,
    id: string,
    transition: ReportStatusTransition,
  ): Promise<ReportRow | null> {
    const [row] = await this.db
      .update(reports)
      .set({ status: transition.to, updatedAt: sql`now()` })
      .where(
        and(
          eq(reports.projectId, projectId),
          eq(reports.id, id),
          inArray(reports.status, transition.from as string[]),
        ),
      )
      .returning();
    return (row as ReportRow) ?? null;
  }

  async findById(projectId: string, id: string): Promise<ReportRow | null> {
    const [row] = await this.db
      .select()
      .from(reports)
      .where(and(eq(reports.projectId, projectId), eq(reports.id, id), isNull(reports.deletedAt)))
      .limit(1);
    return (row as ReportRow) ?? null;
  }

  async listByProject(
    projectId: string,
    pagination?: PaginationParams,
  ): Promise<Paginated<ReportRow>> {
    const { page, pageSize, offset } = normalizePagination(pagination);
    const where = and(eq(reports.projectId, projectId), isNull(reports.deletedAt));

    const [items, countRows] = await Promise.all([
      this.db.select().from(reports).where(where).limit(pageSize).offset(offset),
      this.db.select({ count: sql<number>`count(*)::int` }).from(reports).where(where),
    ]);

    return { items: items as ReportRow[], page, pageSize, total: extractTotal(countRows) };
  }

  async softDelete(projectId: string, id: string): Promise<void> {
    await this.db
      .update(reports)
      .set({ deletedAt: sql`now()` })
      .where(and(eq(reports.projectId, projectId), eq(reports.id, id)));
  }
}
