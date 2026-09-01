import { Body, Controller, Get, Param, Post, Query, Req, UseGuards } from "@nestjs/common";
import type { Request } from "express";
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
}
