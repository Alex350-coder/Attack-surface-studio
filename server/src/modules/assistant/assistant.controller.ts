import { Body, Controller, Param, Post, Req, UseGuards } from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";
import type { Request } from "express";
import { UnauthorizedError } from "../../core/http/domain-error";
import { ZodValidationPipe } from "../../core/validation/zod-validation.pipe";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { Roles } from "../auth/guards/roles.decorator";
import { RolesGuard } from "../auth/guards/roles.guard";
import { PROJECT_ROLES } from "../projects/repositories/project-members.repository";
import { assistantQuerySchema, type AssistantQueryDto } from "./dto/assistant-query.dto";
import { assistantRecommendSchema, type AssistantRecommendDto } from "./dto/assistant-recommend.dto";
import {
  assistantConfirmInsightSchema,
  type AssistantConfirmInsightDto,
} from "./dto/assistant-confirm-insight.dto";
import { AssistantService, type AssistantAnswer, type AssistantInsightResult } from "./assistant.service";

const MEMBER_ROLES = ["owner", "admin", "member"] as const;

/** Stricter than the global default (SEC-036): each call reaches an external LLM API, which is
 * both a cost surface and a payload the caller can size up to the request-body limit. */
const ASSISTANT_THROTTLE = { default: { limit: 20, ttl: 60_000 } };

function requireUserId(request: Request): string {
  const userId = request.user?.sub;
  if (!userId) {
    throw new UnauthorizedError("Authentication is required");
  }
  return userId;
}

@Controller("projects/:projectId/assistant")
export class AssistantController {
  constructor(private readonly assistantService: AssistantService) {}

  @Post("query")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(...PROJECT_ROLES)
  @Throttle(ASSISTANT_THROTTLE)
  async query(
    @Param("projectId") projectId: string,
    @Body(new ZodValidationPipe(assistantQuerySchema)) body: AssistantQueryDto,
  ): Promise<AssistantAnswer> {
    return this.assistantService.query(projectId, body);
  }

  @Post("recommend")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(...PROJECT_ROLES)
  @Throttle(ASSISTANT_THROTTLE)
  async recommend(
    @Param("projectId") projectId: string,
    @Body(new ZodValidationPipe(assistantRecommendSchema)) body: AssistantRecommendDto,
  ): Promise<AssistantAnswer> {
    return this.assistantService.recommend(projectId, body);
  }

  /** The only write endpoint -- confirming an insight is a deliberate human action, never
   * triggered automatically by a query/recommend response. */
  @Post("insights")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(...MEMBER_ROLES)
  @Throttle(ASSISTANT_THROTTLE)
  async confirmInsight(
    @Req() request: Request,
    @Param("projectId") projectId: string,
    @Body(new ZodValidationPipe(assistantConfirmInsightSchema)) body: AssistantConfirmInsightDto,
  ): Promise<AssistantInsightResult> {
    return this.assistantService.confirmInsight(projectId, requireUserId(request), body);
  }
}
