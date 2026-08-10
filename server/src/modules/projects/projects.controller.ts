import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Req, UseGuards } from "@nestjs/common";
import type { Request } from "express";
import { UnauthorizedError } from "../../core/http/domain-error";
import { ZodValidationPipe } from "../../core/validation/zod-validation.pipe";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { Roles } from "../auth/guards/roles.decorator";
import { RolesGuard } from "../auth/guards/roles.guard";
import { PROJECT_ROLES } from "./repositories/project-members.repository";
import { paginationQuerySchema, type PaginationQueryDto } from "../shared/pagination.dto";
import { graphQuerySchema, type GraphQueryDto } from "./dto/graph-query.dto";
import { addOrAssignMemberSchema, type AddOrAssignMemberDto } from "./dto/project-member.dto";
import { createProjectSchema, updateProjectSchema, type CreateProjectDto, type UpdateProjectDto } from "./dto/project.dto";
import type { ProjectDto, ProjectMemberDto } from "./mappers/project.mapper";
import { ProjectsService, type ProjectGraph } from "./projects.service";
import type { Paginated } from "../shared/repository.types";

function requireUserId(request: Request): string {
  const userId = request.user?.sub;
  if (!userId) {
    throw new UnauthorizedError("Authentication is required");
  }
  return userId;
}

@Controller("projects")
export class ProjectsController {
  constructor(private readonly projectsService: ProjectsService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  async create(
    @Req() request: Request,
    @Body(new ZodValidationPipe(createProjectSchema)) body: CreateProjectDto,
  ): Promise<ProjectDto> {
    return this.projectsService.createProject(requireUserId(request), body);
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  async list(
    @Req() request: Request,
    @Query(new ZodValidationPipe(paginationQuerySchema)) query: PaginationQueryDto,
  ): Promise<Paginated<ProjectDto>> {
    return this.projectsService.listForCurrentUser(requireUserId(request), query);
  }

  @Get(":projectId")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(...PROJECT_ROLES)
  async detail(@Param("projectId") projectId: string): Promise<ProjectDto> {
    return this.projectsService.getProjectDetail(projectId);
  }

  @Patch(":projectId")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("owner", "admin")
  async update(
    @Param("projectId") projectId: string,
    @Body(new ZodValidationPipe(updateProjectSchema)) body: UpdateProjectDto,
  ): Promise<ProjectDto> {
    return this.projectsService.updateProject(projectId, body);
  }

  @Delete(":projectId")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("owner")
  async remove(@Param("projectId") projectId: string): Promise<{ success: true }> {
    await this.projectsService.deleteProject(projectId);
    return { success: true };
  }

  @Get(":projectId/members")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(...PROJECT_ROLES)
  async listMembers(
    @Param("projectId") projectId: string,
    @Query(new ZodValidationPipe(paginationQuerySchema)) query: PaginationQueryDto,
  ): Promise<Paginated<ProjectMemberDto>> {
    return this.projectsService.listMembers(projectId, query);
  }

  @Post(":projectId/members")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("owner", "admin")
  async addOrAssignMember(
    @Req() request: Request,
    @Param("projectId") projectId: string,
    @Body(new ZodValidationPipe(addOrAssignMemberSchema)) body: AddOrAssignMemberDto,
  ): Promise<ProjectMemberDto> {
    return this.projectsService.addOrAssignMember(requireUserId(request), projectId, body);
  }

  @Get(":projectId/graph")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(...PROJECT_ROLES)
  async graph(
    @Param("projectId") projectId: string,
    @Query(new ZodValidationPipe(graphQuerySchema)) query: GraphQueryDto,
  ): Promise<ProjectGraph> {
    return this.projectsService.getGraph(projectId, query);
  }
}
