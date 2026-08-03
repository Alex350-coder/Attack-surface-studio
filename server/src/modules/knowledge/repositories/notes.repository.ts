import { and, eq, isNull, sql } from "drizzle-orm";
import type { Database } from "../../../core/database/client";
import { notes } from "../../../core/database/schema";
import {
  extractTotal,
  normalizePagination,
  type Paginated,
  type PaginationParams,
} from "../../shared/repository.types";

export interface NoteRow {
  id: string;
  projectId: string;
  nodeId: string | null;
  authorId: string | null;
  body: string;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

export interface NoteCreateInput {
  nodeId?: string | null;
  authorId?: string | null;
  body: string;
}

/** All data access for the `notes` table. Every method is project-scoped (DB-013, SEC-012). */
export interface NotesRepository {
  create(projectId: string, input: NoteCreateInput): Promise<NoteRow>;
  update(projectId: string, id: string, body: string): Promise<NoteRow | null>;
  findById(projectId: string, id: string): Promise<NoteRow | null>;
  listByProject(
    projectId: string,
    nodeId?: string,
    pagination?: PaginationParams,
  ): Promise<Paginated<NoteRow>>;
  softDelete(projectId: string, id: string): Promise<void>;
}

export class DrizzleNotesRepository implements NotesRepository {
  constructor(private readonly db: Database) {}

  async create(projectId: string, input: NoteCreateInput): Promise<NoteRow> {
    const [row] = await this.db
      .insert(notes)
      .values({
        projectId,
        nodeId: input.nodeId ?? null,
        authorId: input.authorId ?? null,
        body: input.body,
      })
      .returning();
    return row as NoteRow;
  }

  async update(projectId: string, id: string, body: string): Promise<NoteRow | null> {
    const [row] = await this.db
      .update(notes)
      .set({ body, updatedAt: sql`now()` })
      .where(and(eq(notes.projectId, projectId), eq(notes.id, id)))
      .returning();
    return (row as NoteRow) ?? null;
  }

  async findById(projectId: string, id: string): Promise<NoteRow | null> {
    const [row] = await this.db
      .select()
      .from(notes)
      .where(and(eq(notes.projectId, projectId), eq(notes.id, id), isNull(notes.deletedAt)))
      .limit(1);
    return (row as NoteRow) ?? null;
  }

  async listByProject(
    projectId: string,
    nodeId?: string,
    pagination?: PaginationParams,
  ): Promise<Paginated<NoteRow>> {
    const { page, pageSize, offset } = normalizePagination(pagination);
    const conditions = [eq(notes.projectId, projectId), isNull(notes.deletedAt)];
    if (nodeId) conditions.push(eq(notes.nodeId, nodeId));
    const where = and(...conditions);

    const [items, countRows] = await Promise.all([
      this.db.select().from(notes).where(where).limit(pageSize).offset(offset),
      this.db.select({ count: sql<number>`count(*)::int` }).from(notes).where(where),
    ]);

    return { items, page, pageSize, total: extractTotal(countRows) };
  }

  async softDelete(projectId: string, id: string): Promise<void> {
    await this.db
      .update(notes)
      .set({ deletedAt: sql`now()` })
      .where(and(eq(notes.projectId, projectId), eq(notes.id, id)));
  }
}
