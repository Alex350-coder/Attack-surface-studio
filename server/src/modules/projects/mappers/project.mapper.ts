import type { ProjectRow } from "../repositories/projects.repository";
import type { ProjectMemberWithUserRow } from "../repositories/project-members.repository";

export interface ProjectDto {
  id: string;
  name: string;
  slug: string;
  scope: ProjectRow["scope"];
  createdAt: Date;
  updatedAt: Date;
}

export interface ProjectMemberDto {
  id: string;
  projectId: string;
  userId: string;
  email: string;
  displayName: string | null;
  role: ProjectMemberWithUserRow["role"];
  createdAt: Date;
}

/** Explicit allow-list (BE-009): a DB row is never returned to the client as-is. */
export function toProjectDto(row: ProjectRow): ProjectDto {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    scope: row.scope,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export function toProjectMemberDto(row: ProjectMemberWithUserRow): ProjectMemberDto {
  return {
    id: row.id,
    projectId: row.projectId,
    userId: row.userId,
    email: row.email,
    displayName: row.displayName,
    role: row.role,
    createdAt: row.createdAt,
  };
}
