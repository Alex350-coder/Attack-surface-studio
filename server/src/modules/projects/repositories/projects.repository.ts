import { and, eq, isNull, sql } from "drizzle-orm";
import type { Database } from "../../../core/database/client";
import { projectMembers, projects } from "../../../core/database/schema";
import { projectScopeSchema, type ProjectScope } from "./project-scope.schema";
import {
  extractTotal,
  normalizePagination,
  type Paginated,
  type PaginationParams,
} from "../../shared/repository.types";

export interface ProjectRow {
  id: string;
  name: string;
  slug: string;
  scope: ProjectScope;
  createdBy: string | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

export interface ProjectCreateInput {
  name: string;
  slug: string;
  scope?: ProjectScope;
  createdBy?: string | null;
}

/**
 * All data access for the `projects` table. `scope` is validated with Zod before every
 * write (BE-*, SEC boundary validation) since it drives tool-execution authorization.
 */
export interface ProjectsRepository {
  create(input: ProjectCreateInput): Promise<ProjectRow>;
  /**
   * Atomically creates a project and its owner `project_members` row via the
   * `create_project_with_owner` SECURITY DEFINER function (migration 0003), which bypasses the
   * RLS `RETURNING`-vs-SELECT-policy conflict a plain `create()` would hit for the creating user
   * (ADR-010). This is the path `ProjectsService.createProject` uses for real request traffic;
   * `create()` remains for seeds/fixtures that manage membership separately.
   */
  createWithOwner(input: ProjectCreateInput & { createdBy: string }): Promise<ProjectRow>;
  updateScope(id: string, scope: ProjectScope): Promise<ProjectRow | null>;
  /** Updates whichever of `name`/`scope` are provided in a single write — used by `PATCH /projects/:id`. */
  update(id: string, patch: { name?: string; scope?: ProjectScope }): Promise<ProjectRow | null>;
  findById(id: string): Promise<ProjectRow | null>;
  findBySlug(slug: string): Promise<ProjectRow | null>;
  list(pagination?: PaginationParams): Promise<Paginated<ProjectRow>>;
  /**
   * Scopes the result to projects the given user is a member of (SEC-012 defense in depth
   * alongside RLS, not a replacement for it) — the query `GET /projects` uses.
   */
  listForUser(userId: string, pagination?: PaginationParams): Promise<Paginated<ProjectRow>>;
  softDelete(id: string): Promise<void>;
}

export class DrizzleProjectsRepository implements ProjectsRepository {
  constructor(private readonly db: Database) {}

  async create(input: ProjectCreateInput): Promise<ProjectRow> {
    const scope = projectScopeSchema.parse(input.scope ?? {});
    const [row] = await this.db
      .insert(projects)
      .values({
        name: input.name,
        slug: input.slug,
        scope,
        createdBy: input.createdBy ?? null,
      })
      .returning();
    return row as ProjectRow;
  }

  async createWithOwner(input: ProjectCreateInput & { createdBy: string }): Promise<ProjectRow> {
    const scope = projectScopeSchema.parse(input.scope ?? {});
    const result = await this.db.execute<{
      id: string;
      name: string;
      slug: string;
      scope: ProjectScope;
      created_by: string | null;
      created_at: Date;
      updated_at: Date;
      deleted_at: Date | null;
    }>(
      sql`select * from create_project_with_owner(${input.name}, ${input.slug}, ${JSON.stringify(scope)}::jsonb, ${input.createdBy})`,
    );
    const row = result.rows[0];
    if (!row) {
      throw new Error("create_project_with_owner returned no row");
    }
    return {
      id: row.id,
      name: row.name,
      slug: row.slug,
      scope: row.scope,
      createdBy: row.created_by,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      deletedAt: row.deleted_at,
    };
  }

  async updateScope(id: string, scope: ProjectScope): Promise<ProjectRow | null> {
    const validScope = projectScopeSchema.parse(scope);
    const [row] = await this.db
      .update(projects)
      .set({ scope: validScope, updatedAt: sql`now()` })
      .where(eq(projects.id, id))
      .returning();
    return (row as ProjectRow) ?? null;
  }

  async update(id: string, patch: { name?: string; scope?: ProjectScope }): Promise<ProjectRow | null> {
    const set: { updatedAt: ReturnType<typeof sql>; name?: string; scope?: ProjectScope } = {
      updatedAt: sql`now()`,
    };
    if (patch.name !== undefined) {
      set.name = patch.name;
    }
    if (patch.scope !== undefined) {
      set.scope = projectScopeSchema.parse(patch.scope);
    }
    const [row] = await this.db.update(projects).set(set).where(eq(projects.id, id)).returning();
    return (row as ProjectRow) ?? null;
  }

  async findById(id: string): Promise<ProjectRow | null> {
    const [row] = await this.db
      .select()
      .from(projects)
      .where(and(eq(projects.id, id), isNull(projects.deletedAt)))
      .limit(1);
    return (row as ProjectRow) ?? null;
  }

  async findBySlug(slug: string): Promise<ProjectRow | null> {
    const [row] = await this.db
      .select()
      .from(projects)
      .where(and(eq(projects.slug, slug), isNull(projects.deletedAt)))
      .limit(1);
    return (row as ProjectRow) ?? null;
  }

  async list(pagination?: PaginationParams): Promise<Paginated<ProjectRow>> {
    const { page, pageSize, offset } = normalizePagination(pagination);
    const where = isNull(projects.deletedAt);

    const [items, countRows] = await Promise.all([
      this.db.select().from(projects).where(where).limit(pageSize).offset(offset),
      this.db.select({ count: sql<number>`count(*)::int` }).from(projects).where(where),
    ]);

    return { items: items as ProjectRow[], page, pageSize, total: extractTotal(countRows) };
  }

  async listForUser(userId: string, pagination?: PaginationParams): Promise<Paginated<ProjectRow>> {
    const { page, pageSize, offset } = normalizePagination(pagination);
    const where = and(eq(projectMembers.userId, userId), isNull(projects.deletedAt));

    const [items, countRows] = await Promise.all([
      this.db
        .select({
          id: projects.id,
          name: projects.name,
          slug: projects.slug,
          scope: projects.scope,
          createdBy: projects.createdBy,
          createdAt: projects.createdAt,
          updatedAt: projects.updatedAt,
          deletedAt: projects.deletedAt,
        })
        .from(projects)
        .innerJoin(projectMembers, eq(projectMembers.projectId, projects.id))
        .where(where)
        .limit(pageSize)
        .offset(offset),
      this.db
        .select({ count: sql<number>`count(*)::int` })
        .from(projects)
        .innerJoin(projectMembers, eq(projectMembers.projectId, projects.id))
        .where(where),
    ]);

    return { items: items as ProjectRow[], page, pageSize, total: extractTotal(countRows) };
  }

  async softDelete(id: string): Promise<void> {
    await this.db
      .update(projects)
      .set({ deletedAt: sql`now()` })
      .where(eq(projects.id, id));
  }
}
