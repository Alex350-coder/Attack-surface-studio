import { Body, Controller, Get, Param, Post, Query, Req, Res, UseGuards } from "@nestjs/common";
import type { Request, Response } from "express";
import { UnauthorizedError } from "../../core/http/domain-error";
import { ZodValidationPipe } from "../../core/validation/zod-validation.pipe";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { Roles } from "../auth/guards/roles.decorator";
import { RolesGuard } from "../auth/guards/roles.guard";
import { PROJECT_ROLES } from "../projects/repositories/project-members.repository";
import type { ReportRow } from "../knowledge/repositories/reports.repository";
import { paginationQuerySchema, type PaginationQueryDto } from "../shared/pagination.dto";
import type { Paginated } from "../shared/repository.types";
import { createReportSchema, type CreateReportDto } from "./dto/create-report.dto";
import { exportReportQuerySchema, type ExportReportQueryDto } from "./dto/export-report-query.dto";
import { ReportsService } from "./reports.service";

const MEMBER_ROLES = ["owner", "admin", "member"] as const;

function requireUserId(request: Request): string {
  const userId = request.user?.sub;
  if (!userId) {
    throw new UnauthorizedError("Authentication is required");
  }
  return userId;
}

@Controller("projects/:projectId/reports")
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(...MEMBER_ROLES)
  async create(
    @Req() request: Request,
    @Param("projectId") projectId: string,
    @Body(new ZodValidationPipe(createReportSchema)) body: CreateReportDto,
  ): Promise<ReportRow> {
    return this.reportsService.createReport(projectId, requireUserId(request), body);
  }

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(...PROJECT_ROLES)
  async list(
    @Param("projectId") projectId: string,
    @Query(new ZodValidationPipe(paginationQuerySchema)) query: PaginationQueryDto,
  ): Promise<Paginated<ReportRow>> {
    return this.reportsService.listReports(projectId, query);
  }

  @Get(":reportId")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(...PROJECT_ROLES)
  async detail(@Param("projectId") projectId: string, @Param("reportId") reportId: string): Promise<ReportRow> {
    return this.reportsService.getReport(projectId, reportId);
  }

  /**
   * Streams a rendered report back. `@Res()` bypasses the JSON envelope interceptor, mirroring
   * `knowledge.controller.ts`'s `evidenceContent` endpoint -- but unlike evidence, a rendered
   * report is never trusted enough to render inline, so disposition is always `attachment`
   * (SEC-052).
   */
  @Get(":reportId/export")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(...PROJECT_ROLES)
  async export(
    @Req() request: Request,
    @Param("projectId") projectId: string,
    @Param("reportId") reportId: string,
    @Query(new ZodValidationPipe(exportReportQuerySchema)) query: ExportReportQueryDto,
    @Res() response: Response,
  ): Promise<void> {
    const { buffer, mimeType, extension } = await this.reportsService.exportReport(
      projectId,
      reportId,
      requireUserId(request),
      query.format,
      request.headers["x-correlation-id"] as string | undefined,
    );
    response
      .status(200)
      .set({
        "Content-Type": mimeType,
        "Content-Disposition": `attachment; filename="${reportId}.${extension}"`,
        "Content-Length": String(buffer.byteLength),
      })
      .send(buffer);
  }
}
