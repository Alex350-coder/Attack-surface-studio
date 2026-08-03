import { and, eq, isNull, sql } from "drizzle-orm";
import type { Database } from "../../../core/database/client";
import { evidenceFiles } from "../../../core/database/schema";
import {
  extractTotal,
  normalizePagination,
  type Paginated,
  type PaginationParams,
} from "../../shared/repository.types";

export interface EvidenceFileRow {
  id: string;
  projectId: string;
  nodeId: string | null;
  fileRef: string;
  contentHash: string;
  mimeType: string;
  label: string | null;
  uploadedBy: string | null;
  createdAt: Date;
  deletedAt: Date | null;
}

export interface EvidenceFileCreateInput {
  nodeId?: string | null;
  fileRef: string;
  contentHash: string;
  mimeType: string;
  label?: string | null;
  uploadedBy?: string | null;
}

/** All data access for the `evidence_files` table. Every method is project-scoped (DB-013, SEC-012). */
export interface EvidenceFilesRepository {
  create(projectId: string, input: EvidenceFileCreateInput): Promise<EvidenceFileRow>;
  findById(projectId: string, id: string): Promise<EvidenceFileRow | null>;
  listByProject(
    projectId: string,
    nodeId?: string,
    pagination?: PaginationParams,
  ): Promise<Paginated<EvidenceFileRow>>;
  softDelete(projectId: string, id: string): Promise<void>;
}

export class DrizzleEvidenceFilesRepository implements EvidenceFilesRepository {
  constructor(private readonly db: Database) {}

  async create(projectId: string, input: EvidenceFileCreateInput): Promise<EvidenceFileRow> {
    const [row] = await this.db
      .insert(evidenceFiles)
      .values({
        projectId,
        nodeId: input.nodeId ?? null,
        fileRef: input.fileRef,
        contentHash: input.contentHash,
        mimeType: input.mimeType,
        label: input.label ?? null,
        uploadedBy: input.uploadedBy ?? null,
      })
      .returning();
    return row as EvidenceFileRow;
  }

  async findById(projectId: string, id: string): Promise<EvidenceFileRow | null> {
    const [row] = await this.db
      .select()
      .from(evidenceFiles)
      .where(
        and(
          eq(evidenceFiles.projectId, projectId),
          eq(evidenceFiles.id, id),
          isNull(evidenceFiles.deletedAt),
        ),
      )
      .limit(1);
    return (row as EvidenceFileRow) ?? null;
  }

  async listByProject(
    projectId: string,
    nodeId?: string,
    pagination?: PaginationParams,
  ): Promise<Paginated<EvidenceFileRow>> {
    const { page, pageSize, offset } = normalizePagination(pagination);
    const conditions = [eq(evidenceFiles.projectId, projectId), isNull(evidenceFiles.deletedAt)];
    if (nodeId) conditions.push(eq(evidenceFiles.nodeId, nodeId));
    const where = and(...conditions);

    const [items, countRows] = await Promise.all([
      this.db.select().from(evidenceFiles).where(where).limit(pageSize).offset(offset),
      this.db.select({ count: sql<number>`count(*)::int` }).from(evidenceFiles).where(where),
    ]);

    return { items, page, pageSize, total: extractTotal(countRows) };
  }

  async softDelete(projectId: string, id: string): Promise<void> {
    await this.db
      .update(evidenceFiles)
      .set({ deletedAt: sql`now()` })
      .where(and(eq(evidenceFiles.projectId, projectId), eq(evidenceFiles.id, id)));
  }
}
