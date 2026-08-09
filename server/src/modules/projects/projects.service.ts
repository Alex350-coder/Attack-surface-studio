import { Inject, Injectable } from "@nestjs/common";
import { ConflictError, ForbiddenError, NotFoundError } from "../../core/http/domain-error";
import type { Paginated, PaginationParams } from "../shared/repository.types";
import { edgeSchema, type Edge } from "../../contracts/edge.schema";
import { nodeSchema, type Node } from "../../contracts/node.schema";
import { EDGES_REPOSITORY, NODES_REPOSITORY } from "../knowledge/knowledge.tokens";
import type { EdgesRepository } from "../knowledge/repositories/edges.repository";
import type { NodesRepository } from "../knowledge/repositories/nodes.repository";
import { USERS_REPOSITORY } from "../users/users.tokens";
import type { UsersRepository } from "../users/repositories/users.repository";
import type { CreateProjectDto, UpdateProjectDto } from "./dto/project.dto";
import type { AddOrAssignMemberDto } from "./dto/project-member.dto";
import { toProjectDto, toProjectMemberDto, type ProjectDto, type ProjectMemberDto } from "./mappers/project.mapper";
import { canAssignRole } from "./policies/project-member.policy";
import { PROJECT_MEMBERS_REPOSITORY, PROJECTS_REPOSITORY } from "./projects.tokens";
import type { ProjectMembersRepository } from "./repositories/project-members.repository";
import type { ProjectsRepository } from "./repositories/projects.repository";

export interface ProjectGraph {
  nodes: Paginated<Node>;
  edges: Paginated<Edge>;
}

@Injectable()
export class ProjectsService {
  constructor(
    @Inject(PROJECTS_REPOSITORY) private readonly projectsRepository: ProjectsRepository,
    @Inject(PROJECT_MEMBERS_REPOSITORY) private readonly projectMembersRepository: ProjectMembersRepository,
    @Inject(USERS_REPOSITORY) private readonly usersRepository: UsersRepository,
    @Inject(NODES_REPOSITORY) private readonly nodesRepository: NodesRepository,
    @Inject(EDGES_REPOSITORY) private readonly edgesRepository: EdgesRepository,
  ) {}

  async createProject(actingUserId: string, dto: CreateProjectDto): Promise<ProjectDto> {
    const existing = await this.projectsRepository.findBySlug(dto.slug);
    if (existing) {
      throw new ConflictError(`A project with slug "${dto.slug}" already exists`);
    }
    const row = await this.projectsRepository.createWithOwner({
      name: dto.name,
      slug: dto.slug,
      scope: dto.scope,
      createdBy: actingUserId,
    });
    return toProjectDto(row);
  }

  async listForCurrentUser(actingUserId: string, pagination?: PaginationParams): Promise<Paginated<ProjectDto>> {
    const result = await this.projectsRepository.listForUser(actingUserId, pagination);
    return { ...result, items: result.items.map(toProjectDto) };
  }

  async getProjectDetail(projectId: string): Promise<ProjectDto> {
    const row = await this.projectsRepository.findById(projectId);
    if (!row) {
      throw new NotFoundError("Project not found");
    }
    return toProjectDto(row);
  }

  async updateProject(projectId: string, dto: UpdateProjectDto): Promise<ProjectDto> {
    const row = await this.projectsRepository.update(projectId, { name: dto.name, scope: dto.scope });
    if (!row) {
      throw new NotFoundError("Project not found");
    }
    return toProjectDto(row);
  }

  async deleteProject(projectId: string): Promise<void> {
    const existing = await this.projectsRepository.findById(projectId);
    if (!existing) {
      throw new NotFoundError("Project not found");
    }
    await this.projectsRepository.softDelete(projectId);
  }

  async listMembers(projectId: string, pagination?: PaginationParams): Promise<Paginated<ProjectMemberDto>> {
    const result = await this.projectMembersRepository.listByProject(projectId, pagination);
    return { ...result, items: result.items.map(toProjectMemberDto) };
  }

  async addOrAssignMember(
    actingUserId: string,
    projectId: string,
    dto: AddOrAssignMemberDto,
  ): Promise<ProjectMemberDto> {
    const actingMembership = await this.projectMembersRepository.findByProjectAndUser(projectId, actingUserId);
    if (!actingMembership) {
      throw new ForbiddenError("You are not a member of this project");
    }

    const targetUser = await this.usersRepository.findByEmail(dto.email);
    if (!targetUser) {
      throw new NotFoundError("No user found with that email address");
    }
    if (targetUser.id === actingUserId) {
      throw new ForbiddenError("You cannot change your own project role");
    }

    const existingMembership = await this.projectMembersRepository.findByProjectAndUser(projectId, targetUser.id);
    if (!canAssignRole(actingMembership.role, existingMembership?.role ?? null, dto.role)) {
      throw new ForbiddenError("You are not allowed to assign this role");
    }

    const result = existingMembership
      ? await this.projectMembersRepository.updateRole(projectId, targetUser.id, dto.role)
      : await this.projectMembersRepository.addMember({ projectId, userId: targetUser.id, role: dto.role });
    if (!result) {
      throw new NotFoundError("Project membership not found");
    }
    return toProjectMemberDto(result);
  }

  /** Returns only normalized graph objects (ARC-001) — never raw tool output. */
  async getGraph(projectId: string, pagination?: PaginationParams): Promise<ProjectGraph> {
    const [nodes, edges] = await Promise.all([
      this.nodesRepository.listByProject(projectId, undefined, pagination),
      this.edgesRepository.listByProject(projectId, undefined, pagination),
    ]);

    return {
      nodes: { ...nodes, items: nodes.items.map((node) => nodeSchema.parse(node)) },
      edges: { ...edges, items: edges.items.map((edge) => edgeSchema.parse(edge)) },
    };
  }
}
