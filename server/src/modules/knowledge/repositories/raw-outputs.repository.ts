import { and, desc, eq } from "drizzle-orm";
import type { Database } from "../../../core/database/client";
import { rawOutputs, toolRuns } from "../../../core/database/schema";

export interface RawOutputRow {
  id: string;
  toolRunId: string;
  format: string;
  contentRef: string;
  contentHash: string;
  byteSize: number;
  createdAt: Date;
}

export interface RawOutputCreateInput {
  toolRunId: string;
  format: string;
  contentRef: string;
  contentHash: string;
  byteSize: number;
}

/**
 * All data access for the write-once `raw_outputs` audit trail (DATA_MODEL.md §5) -- never
 * updated, never soft-deleted. The table has no `project_id` column of its own, so project
 * scoping (DB-013, SEC-012) is enforced by joining through `tool_runs`.
 */
export interface RawOutputsRepository {
  create(input: RawOutputCreateInput): Promise<RawOutputRow>;
  /** Most recent raw output for a run, or null if none was ever captured (e.g. an old failed run). */
  findLatestByToolRunId(projectId: string, toolRunId: string): Promise<RawOutputRow | null>;
}

export class DrizzleRawOutputsRepository implements RawOutputsRepository {
  constructor(private readonly db: Database) {}

  async create(input: RawOutputCreateInput): Promise<RawOutputRow> {
    const [row] = await this.db
      .insert(rawOutputs)
      .values({
        toolRunId: input.toolRunId,
        format: input.format,
        contentRef: input.contentRef,
        contentHash: input.contentHash,
        byteSize: input.byteSize,
      })
      .returning();
    return row as RawOutputRow;
  }

  async findLatestByToolRunId(projectId: string, toolRunId: string): Promise<RawOutputRow | null> {
    const [row] = await this.db
      .select({
        id: rawOutputs.id,
        toolRunId: rawOutputs.toolRunId,
        format: rawOutputs.format,
        contentRef: rawOutputs.contentRef,
        contentHash: rawOutputs.contentHash,
        byteSize: rawOutputs.byteSize,
        createdAt: rawOutputs.createdAt,
      })
      .from(rawOutputs)
      .innerJoin(toolRuns, eq(rawOutputs.toolRunId, toolRuns.id))
      .where(and(eq(toolRuns.projectId, projectId), eq(rawOutputs.toolRunId, toolRunId)))
      .orderBy(desc(rawOutputs.createdAt))
      .limit(1);
    return (row as RawOutputRow) ?? null;
  }
}
