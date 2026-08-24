import { Body, Controller, Param, Post, Req, UseGuards } from "@nestjs/common";
import type { Request } from "express";
import { UnauthorizedError } from "../../core/http/domain-error";
import { ZodValidationPipe } from "../../core/validation/zod-validation.pipe";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { Roles } from "../auth/guards/roles.decorator";
import { RolesGuard } from "../auth/guards/roles.guard";
import { manualNodeSchema, type ManualNodeDto } from "./dto/manual-node.dto";
import { manualEdgeSchema, type ManualEdgeDto } from "./dto/manual-edge.dto";
import { KnowledgeService } from "./knowledge.service";
import type { NodeRow } from "./repositories/nodes.repository";
import type { EdgeRow } from "./repositories/edges.repository";

const MEMBER_ROLES = ["owner", "admin", "member"] as const;

function requireUserId(request: Request): string {
  const userId = request.user?.sub;
  if (!userId) {
    throw new UnauthorizedError("Authentication is required");
  }
  return userId;
}

@Controller("projects/:projectId")
export class KnowledgeController {
  constructor(private readonly knowledgeService: KnowledgeService) {}

  @Post("nodes")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(...MEMBER_ROLES)
  async addNode(
    @Req() request: Request,
    @Param("projectId") projectId: string,
    @Body(new ZodValidationPipe(manualNodeSchema)) body: ManualNodeDto,
  ): Promise<NodeRow> {
    return this.knowledgeService.addNode(projectId, requireUserId(request), body);
  }

  @Post("edges")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(...MEMBER_ROLES)
  async addEdge(
    @Param("projectId") projectId: string,
    @Body(new ZodValidationPipe(manualEdgeSchema)) body: ManualEdgeDto,
  ): Promise<EdgeRow> {
    return this.knowledgeService.addEdge(projectId, body);
  }
}
