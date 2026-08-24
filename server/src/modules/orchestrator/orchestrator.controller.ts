import { Body, Controller, Get, Param, Post, Query, Req, Res, UseGuards } from "@nestjs/common";
import type { Request, Response } from "express";
import { UnauthorizedError } from "../../core/http/domain-error";
import { ZodValidationPipe } from "../../core/validation/zod-validation.pipe";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { Roles } from "../auth/guards/roles.decorator";
import { RolesGuard } from "../auth/guards/roles.guard";
import { PROJECT_ROLES } from "../projects/repositories/project-members.repository";
import { paginationQuerySchema, type PaginationQueryDto } from "../shared/pagination.dto";
import type { Paginated } from "../shared/repository.types";
import { enqueueRunSchema, type EnqueueRunDto } from "./dto/enqueue-run.dto";
import type { ToolRunDto } from "./mappers/tool-run.mapper";
import { OrchestratorService } from "./orchestrator.service";

const MEMBER_ROLES = ["owner", "admin", "member"] as const;

function requireUserId(request: Request): string {
  const userId = request.user?.sub;
  if (!userId) {
    throw new UnauthorizedError("Authentication is required");
  }
  return userId;
}

@Controller("projects/:projectId/runs")
export class OrchestratorController {
  constructor(private readonly orchestratorService: OrchestratorService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(...MEMBER_ROLES)
  async enqueue(
    @Req() request: Request,
    @Param("projectId") projectId: string,
    @Body(new ZodValidationPipe(enqueueRunSchema)) body: EnqueueRunDto,
  ): Promise<ToolRunDto> {
    return this.orchestratorService.enqueueRun(requireUserId(request), projectId, body);
  }

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(...PROJECT_ROLES)
  async list(
    @Param("projectId") projectId: string,
    @Query(new ZodValidationPipe(paginationQuerySchema)) query: PaginationQueryDto,
  ): Promise<Paginated<ToolRunDto>> {
    return this.orchestratorService.listRuns(projectId, query);
  }

  @Get(":runId")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(...PROJECT_ROLES)
  async detail(@Param("projectId") projectId: string, @Param("runId") runId: string): Promise<ToolRunDto> {
    return this.orchestratorService.getRun(projectId, runId);
  }

  @Post(":runId/cancel")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(...MEMBER_ROLES)
  async cancel(@Param("projectId") projectId: string, @Param("runId") runId: string): Promise<ToolRunDto> {
    return this.orchestratorService.cancelRun(projectId, runId);
  }

  /**
   * Audit-only access to a run's raw stdout. `@Res()` (no `passthrough`) hands full control of
   * the response to us so the global `TransformResponseInterceptor` never wraps binary output in
   * the `{ success, data }` JSON envelope, and the file is always served as an attachment --
   * never inline-rendered (SEC-052) -- so it can't be mistaken for a trusted graph object.
   */
  @Get(":runId/raw")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("owner", "admin")
  async raw(
    @Param("projectId") projectId: string,
    @Param("runId") runId: string,
    @Res() response: Response,
  ): Promise<void> {
    const { buffer, format, byteSize } = await this.orchestratorService.getRawOutput(projectId, runId);
    response
      .status(200)
      .set({
        "Content-Type": "application/octet-stream",
        "Content-Disposition": `attachment; filename="${runId}-${format}.txt"`,
        "Content-Length": String(byteSize),
      })
      .send(buffer);
  }
}
