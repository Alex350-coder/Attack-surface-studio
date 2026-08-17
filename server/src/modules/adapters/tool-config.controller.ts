import { Body, Controller, Get, Param, Put, Post, UseGuards } from "@nestjs/common";
import { ZodValidationPipe } from "../../core/validation/zod-validation.pipe";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { Roles } from "../auth/guards/roles.decorator";
import { RolesGuard } from "../auth/guards/roles.guard";
import { detectToolSchema, setToolConfigSchema, type DetectToolDto, type SetToolConfigDto } from "./dto/tool-config.dto";
import type { DetectionResult } from "./adapter.contract";
import { ToolConfigService, type ToolListing } from "./tool-config.service";
import type { ToolConfigRow } from "./repositories/tool-configs.repository";

/**
 * `GET /tools` is a static registry read shared by every project (no privilege or per-project
 * meaning), so it only requires authentication. Detection and config are project-scoped
 * (ADR-013): `RolesGuard` only knows how to check membership against `request.params.projectId`,
 * there is no global/platform role concept, so these live under `/projects/:projectId/tools*`.
 */
@Controller()
export class ToolConfigController {
  constructor(private readonly toolConfigService: ToolConfigService) {}

  @Get("tools")
  @UseGuards(JwtAuthGuard)
  listTools(): ToolListing[] {
    return this.toolConfigService.listTools();
  }

  @Post("projects/:projectId/tools/:toolId/detect")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("owner", "admin")
  async detect(
    @Param("toolId") toolId: string,
    @Body(new ZodValidationPipe(detectToolSchema)) body: DetectToolDto,
  ): Promise<DetectionResult> {
    return this.toolConfigService.detectTool(toolId, body.mode);
  }

  @Get("projects/:projectId/tools/:toolId/config")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("owner", "admin")
  async getConfig(
    @Param("projectId") projectId: string,
    @Param("toolId") toolId: string,
  ): Promise<ToolConfigRow | null> {
    return this.toolConfigService.getConfig(projectId, toolId);
  }

  @Put("projects/:projectId/tools/:toolId/config")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("owner", "admin")
  async setConfig(
    @Param("projectId") projectId: string,
    @Param("toolId") toolId: string,
    @Body(new ZodValidationPipe(setToolConfigSchema)) body: SetToolConfigDto,
  ): Promise<ToolConfigRow> {
    return this.toolConfigService.setConfig(projectId, toolId, body);
  }
}
