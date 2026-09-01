import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  Req,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { fromBuffer } from "file-type";
import type { Request, Response } from "express";
import { UnauthorizedError, ValidationError } from "../../core/http/domain-error";
import { ZodValidationPipe } from "../../core/validation/zod-validation.pipe";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { Roles } from "../auth/guards/roles.decorator";
import { RolesGuard } from "../auth/guards/roles.guard";
import { PROJECT_ROLES } from "../projects/repositories/project-members.repository";
import { paginationQuerySchema, type PaginationQueryDto } from "../shared/pagination.dto";
import type { Paginated } from "../shared/repository.types";
import { manualNodeSchema, type ManualNodeDto } from "./dto/manual-node.dto";
import { manualEdgeSchema, type ManualEdgeDto } from "./dto/manual-edge.dto";
import {
  ALLOWED_EVIDENCE_MIME_TYPES,
  MAX_EVIDENCE_FILE_BYTES,
  evidenceUploadFieldsSchema,
} from "./dto/evidence-upload.dto";
import { createNoteSchema, type CreateNoteDto } from "./dto/note.dto";
import { KnowledgeService } from "./knowledge.service";
import type { NodeRow } from "./repositories/nodes.repository";
import type { EdgeRow } from "./repositories/edges.repository";
import type { EvidenceFileRow } from "./repositories/evidence-files.repository";
import type { NoteRow } from "./repositories/notes.repository";

const MEMBER_ROLES = ["owner", "admin", "member"] as const;

interface UploadedEvidenceFile {
  buffer: Buffer;
  size: number;
}

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

  @Post("evidence")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(...MEMBER_ROLES)
  @UseInterceptors(FileInterceptor("file", { limits: { fileSize: MAX_EVIDENCE_FILE_BYTES } }))
  async addEvidence(
    @Req() request: Request,
    @Param("projectId") projectId: string,
    @UploadedFile() file: UploadedEvidenceFile | undefined,
    @Body(new ZodValidationPipe(evidenceUploadFieldsSchema)) fields: { nodeId?: string; label?: string },
  ): Promise<EvidenceFileRow> {
    if (!file) {
      throw new ValidationError("An evidence file is required (multipart field 'file')");
    }

    const detected = await fromBuffer(file.buffer).catch(() => undefined);
    const sniffedMimeType = detected?.mime;
    if (!sniffedMimeType || !(ALLOWED_EVIDENCE_MIME_TYPES as readonly string[]).includes(sniffedMimeType)) {
      throw new ValidationError(
        "Unsupported evidence file type -- content does not match an allowed image or PDF signature",
      );
    }

    return this.knowledgeService.addEvidence(projectId, requireUserId(request), file.buffer, sniffedMimeType, fields);
  }

  @Get("evidence")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(...PROJECT_ROLES)
  async listEvidence(
    @Param("projectId") projectId: string,
    @Query("nodeId") nodeId: string | undefined,
    @Query(new ZodValidationPipe(paginationQuerySchema)) query: PaginationQueryDto,
  ): Promise<Paginated<EvidenceFileRow>> {
    return this.knowledgeService.listEvidence(projectId, nodeId, query);
  }

  /**
   * Streams evidence bytes back. `@Res()` bypasses the JSON envelope interceptor the same way
   * `orchestrator.controller.ts`'s `raw` endpoint does. Images are already magic-byte-validated
   * at upload time, so they're trusted enough to render inline (`<img src>`); everything else is
   * forced to download so it can never be mistaken for trusted, renderable content (SEC-052).
   */
  @Get("evidence/:evidenceId/content")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(...PROJECT_ROLES)
  async evidenceContent(
    @Param("projectId") projectId: string,
    @Param("evidenceId") evidenceId: string,
    @Res() response: Response,
  ): Promise<void> {
    const { buffer, mimeType } = await this.knowledgeService.getEvidenceContent(projectId, evidenceId);
    const disposition = mimeType.startsWith("image/") ? "inline" : "attachment";
    response
      .status(200)
      .set({
        "Content-Type": mimeType,
        "Content-Disposition": `${disposition}; filename="${evidenceId}"`,
        "Content-Length": String(buffer.byteLength),
      })
      .send(buffer);
  }

  @Post("notes")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(...MEMBER_ROLES)
  async addNote(
    @Req() request: Request,
    @Param("projectId") projectId: string,
    @Body(new ZodValidationPipe(createNoteSchema)) body: CreateNoteDto,
  ): Promise<NoteRow> {
    return this.knowledgeService.addNote(projectId, requireUserId(request), body);
  }
}
