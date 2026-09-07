import { and, eq, sql } from "drizzle-orm";
import type { Database } from "../../../core/database/client";
import { isUniqueViolation } from "../../../core/database/pg-error";
import { projectMembers, users } from "../../../core/database/schema";
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

/**
 * A member row joined with the identifying fields off `users` -- everything the UI needs to show
 * *who* a member actually is instead of a bare `userId` (BUG #5). `addMember`/`updateRole` don't
 * join (their `.returning()` only covers `project_members`); callers that already have the target
 * `UserRow` in hand (e.g. `addOrAssignMember`, which looked it up by email) attach it themselves.
 */
export interface ProjectMemberWithUserRow extends ProjectMemberRow {
  email: string;
  displayName: string | null;
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
  listByProject(projectId: string, pagination?: PaginationParams): Promise<Paginated<ProjectMemberWithUserRow>>;
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

  async listByProject(projectId: string, pagination?: PaginationParams): Promise<Paginated<ProjectMemberWithUserRow>> {
    const { page, pageSize, offset } = normalizePagination(pagination);
    const where = eq(projectMembers.projectId, projectId);

    const [rows, countRows] = await Promise.all([
      this.db
        .select({
          id: projectMembers.id,
          projectId: projectMembers.projectId,
          userId: projectMembers.userId,
          role: projectMembers.role,
          createdAt: projectMembers.createdAt,
          email: users.email,
          displayName: users.displayName,
        })
        .from(projectMembers)
        .innerJoin(users, eq(projectMembers.userId, users.id))
        .where(where)
        .limit(pageSize)
        .offset(offset),
      this.db.select({ count: sql<number>`count(*)::int` }).from(projectMembers).where(where),
    ]);

    return { items: rows as ProjectMemberWithUserRow[], page, pageSize, total: extractTotal(countRows) };
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
