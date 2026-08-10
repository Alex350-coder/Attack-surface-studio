import { and, eq, sql } from "drizzle-orm";
import type { Database } from "../../../core/database/client";
import { isUniqueViolation } from "../../../core/database/pg-error";
import { projectMembers } from "../../../core/database/schema";
import { ConflictError } from "../../../core/http/domain-error";
import {
  extractTotal,
  normalizePagination,
  type Paginated,
  type PaginationParams,
} from "../../shared/repository.types";

export const PROJECT_ROLES = ["owner", "admin", "member", "viewer"] as const;
export type ProjectRole = (typeof PROJECT_ROLES)[number];

export interface ProjectMemberRow {
  id: string;
  projectId: string;
  userId: string;
  role: ProjectRole;
  createdAt: Date;
}

export interface ProjectMemberCreateInput {
  projectId: string;
  userId: string;
  role: ProjectRole;
}

/**
 * All data access for the `project_members` table -- the source of truth `RolesGuard` and the
 * RLS policies from migration 0002 both read (DATA_MODEL.md §3.7, SECURITY_MODEL.md §4).
 */
export interface ProjectMembersRepository {
  addMember(input: ProjectMemberCreateInput): Promise<ProjectMemberRow>;
  findByProjectAndUser(projectId: string, userId: string): Promise<ProjectMemberRow | null>;
  listByProject(projectId: string, pagination?: PaginationParams): Promise<Paginated<ProjectMemberRow>>;
  updateRole(projectId: string, userId: string, role: ProjectRole): Promise<ProjectMemberRow | null>;
  removeMember(projectId: string, userId: string): Promise<void>;
}

export class DrizzleProjectMembersRepository implements ProjectMembersRepository {
  constructor(private readonly db: Database) {}

  async addMember(input: ProjectMemberCreateInput): Promise<ProjectMemberRow> {
    try {
      const [row] = await this.db
        .insert(projectMembers)
        .values({ projectId: input.projectId, userId: input.userId, role: input.role })
        .returning();
      return row as ProjectMemberRow;
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new ConflictError("This user is already a member of the project");
      }
      throw error;
    }
  }

  async findByProjectAndUser(projectId: string, userId: string): Promise<ProjectMemberRow | null> {
    const [row] = await this.db
      .select()
      .from(projectMembers)
      .where(and(eq(projectMembers.projectId, projectId), eq(projectMembers.userId, userId)))
      .limit(1);
    return (row as ProjectMemberRow) ?? null;
  }

  async listByProject(projectId: string, pagination?: PaginationParams): Promise<Paginated<ProjectMemberRow>> {
    const { page, pageSize, offset } = normalizePagination(pagination);
    const where = eq(projectMembers.projectId, projectId);

    const [items, countRows] = await Promise.all([
      this.db.select().from(projectMembers).where(where).limit(pageSize).offset(offset),
      this.db.select({ count: sql<number>`count(*)::int` }).from(projectMembers).where(where),
    ]);

    return { items: items as ProjectMemberRow[], page, pageSize, total: extractTotal(countRows) };
  }

  async updateRole(projectId: string, userId: string, role: ProjectRole): Promise<ProjectMemberRow | null> {
    const [row] = await this.db
      .update(projectMembers)
      .set({ role })
      .where(and(eq(projectMembers.projectId, projectId), eq(projectMembers.userId, userId)))
      .returning();
    return (row as ProjectMemberRow) ?? null;
  }

  async removeMember(projectId: string, userId: string): Promise<void> {
    await this.db
      .delete(projectMembers)
      .where(and(eq(projectMembers.projectId, projectId), eq(projectMembers.userId, userId)));
  }
}
