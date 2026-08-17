import { and, eq } from "drizzle-orm";
import type { Database } from "../../../core/database/client";
import { toolConfigs } from "../../../core/database/schema";
import type { ExecutionMode } from "../adapter.contract";

export interface ToolConfigRow {
  id: string;
  projectId: string;
  adapterId: string;
  executionMode: ExecutionMode;
  config: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

export interface ToolConfigUpsertInput {
  projectId: string;
  adapterId: string;
  executionMode: ExecutionMode;
  config: Record<string, unknown>;
}

/** All data access for the `tool_configs` table -- project-scoped tool execution policy. */
export interface ToolConfigsRepository {
  findByProject(projectId: string): Promise<ToolConfigRow[]>;
  findByProjectAndAdapter(projectId: string, adapterId: string): Promise<ToolConfigRow | null>;
  upsert(input: ToolConfigUpsertInput): Promise<ToolConfigRow>;
}

export class DrizzleToolConfigsRepository implements ToolConfigsRepository {
  constructor(private readonly db: Database) {}

  async findByProject(projectId: string): Promise<ToolConfigRow[]> {
    const rows = await this.db.select().from(toolConfigs).where(eq(toolConfigs.projectId, projectId));
    return rows as ToolConfigRow[];
  }

  async findByProjectAndAdapter(projectId: string, adapterId: string): Promise<ToolConfigRow | null> {
    const [row] = await this.db
      .select()
      .from(toolConfigs)
      .where(and(eq(toolConfigs.projectId, projectId), eq(toolConfigs.adapterId, adapterId)))
      .limit(1);
    return (row as ToolConfigRow) ?? null;
  }

  async upsert(input: ToolConfigUpsertInput): Promise<ToolConfigRow> {
    const [row] = await this.db
      .insert(toolConfigs)
      .values({
        projectId: input.projectId,
        adapterId: input.adapterId,
        executionMode: input.executionMode,
        config: input.config,
      })
      .onConflictDoUpdate({
        target: [toolConfigs.projectId, toolConfigs.adapterId],
        set: {
          executionMode: input.executionMode,
          config: input.config,
          updatedAt: new Date(),
        },
      })
      .returning();
    return row as ToolConfigRow;
  }
}
