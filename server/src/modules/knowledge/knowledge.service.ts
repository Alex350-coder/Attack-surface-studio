import { Inject, Injectable } from "@nestjs/common";
import { NotFoundError } from "../../core/http/domain-error";
import { BLOB_STORAGE } from "../../core/storage/storage.tokens";
import type { BlobStorage } from "../../core/storage/blob-storage.contract";
import { EDGES_REPOSITORY, EVIDENCE_FILES_REPOSITORY, GRAPH_BUILDER, NOTES_REPOSITORY } from "./knowledge.tokens";
import type { GraphBuilderService } from "./graph-builder.service";
import type { EdgeRow, EdgesRepository } from "./repositories/edges.repository";
import type { NodeRow } from "./repositories/nodes.repository";
import type { EvidenceFileRow, EvidenceFilesRepository } from "./repositories/evidence-files.repository";
import type { NoteRow, NotesRepository } from "./repositories/notes.repository";
import type { Paginated, PaginationParams } from "../shared/repository.types";
import type { ManualNodeDto } from "./dto/manual-node.dto";
import type { ManualEdgeDto } from "./dto/manual-edge.dto";
import type { EvidenceUploadFieldsDto } from "./dto/evidence-upload.dto";
import type { CreateNoteDto } from "./dto/note.dto";

/**
 * Manual/user-authored contributions to the graph. Each is conceptually "a GraphDelta of size
 * one" and reuses the same GraphBuilderService persistence path a tool run's delta goes through
 * (Claude.md §9 -- one normalization pipeline, not a parallel one for manual entry).
 */
@Injectable()
export class KnowledgeService {
  constructor(
    @Inject(GRAPH_BUILDER) private readonly graphBuilder: GraphBuilderService,
    @Inject(EDGES_REPOSITORY) private readonly edgesRepository: EdgesRepository,
    @Inject(EVIDENCE_FILES_REPOSITORY) private readonly evidenceFilesRepository: EvidenceFilesRepository,
    @Inject(NOTES_REPOSITORY) private readonly notesRepository: NotesRepository,
    @Inject(BLOB_STORAGE) private readonly blobStorage: BlobStorage,
  ) {}

  async addNode(projectId: string, actingUserId: string, dto: ManualNodeDto): Promise<NodeRow> {
    const { nodes } = await this.graphBuilder.applyDelta(
      projectId,
      { nodes: [dto], edges: [] },
      { sourceRunId: null, createdBy: actingUserId },
    );
    return nodes[0] as NodeRow;
  }

  /** Manual edges already reference real node UUIDs, so no identity-key resolution is needed. */
  async addEdge(projectId: string, dto: ManualEdgeDto): Promise<EdgeRow> {
    const [edge] = await this.edgesRepository.upsertMany(projectId, [{ ...dto, sourceRunId: null }]);
    return edge as EdgeRow;
  }

  /**
   * Persists the uploaded bytes to blob storage, records the `evidence_files` row, and enriches
   * the graph with an `evidence`/`screenshot` node (plus an edge to `nodeId` if supplied) --
   * every uploaded evidence file enriches the graph (Claude.md §3/§9).
   */
  async addEvidence(
    projectId: string,
    actingUserId: string,
    fileBuffer: Buffer,
    mimeType: string,
    fields: EvidenceUploadFieldsDto,
  ): Promise<EvidenceFileRow> {
    const blob = await this.blobStorage.put(fileBuffer);
    const evidenceFile = await this.evidenceFilesRepository.create(projectId, {
      nodeId: fields.nodeId ?? null,
      fileRef: blob.ref,
      contentHash: blob.hash,
      mimeType,
      label: fields.label ?? null,
      uploadedBy: actingUserId,
    });

    const evidenceNodeType = mimeType.startsWith("image/") ? "screenshot" : "evidence";
    const { nodes } = await this.graphBuilder.applyDelta(
      projectId,
      {
        nodes: [
          {
            identityKey: `evidence:${projectId}:${blob.hash}`,
            type: evidenceNodeType,
            category: "artifact",
            label: fields.label ?? `Evidence ${blob.hash.slice(0, 8)}`,
            data: { properties: [{ label: "MIME type", value: mimeType }] },
          },
        ],
        edges: [],
      },
      { sourceRunId: null, createdBy: actingUserId },
    );

    const evidenceNode = nodes[0];
    if (fields.nodeId && evidenceNode) {
      await this.edgesRepository.upsertMany(projectId, [
        { sourceId: evidenceNode.id, targetId: fields.nodeId, type: "evidence", sourceRunId: null },
      ]);
    }

    return evidenceFile;
  }

  async listEvidence(
    projectId: string,
    nodeId?: string,
    pagination?: PaginationParams,
  ): Promise<Paginated<EvidenceFileRow>> {
    return this.evidenceFilesRepository.listByProject(projectId, nodeId, pagination);
  }

  /**
   * Serves evidence bytes back out. Mirrors the orchestrator's raw-output access pattern: the
   * service only resolves identity and fetches the blob -- the controller decides how to send it
   * (attachment vs inline) so the safe-serving decision stays in one place (SEC-052).
   */
  async getEvidenceContent(
    projectId: string,
    evidenceId: string,
  ): Promise<{ buffer: Buffer; mimeType: string; row: EvidenceFileRow }> {
    const row = await this.evidenceFilesRepository.findById(projectId, evidenceId);
    if (!row) {
      throw new NotFoundError(`Evidence file ${evidenceId} was not found in this project`);
    }
    const buffer = await this.blobStorage.get(row.fileRef);
    return { buffer, mimeType: row.mimeType, row };
  }

  /** A note is conceptually "a GraphDelta of size one" -- same persistence path as a manual node. */
  async addNote(projectId: string, actingUserId: string, dto: CreateNoteDto): Promise<NoteRow> {
    const note = await this.notesRepository.create(projectId, {
      nodeId: dto.nodeId ?? null,
      authorId: actingUserId,
      body: dto.body,
    });

    const { nodes } = await this.graphBuilder.applyDelta(
      projectId,
      {
        nodes: [
          {
            identityKey: `note:${note.id}`,
            type: "note",
            category: "intelligence",
            label: dto.body.length > 60 ? `${dto.body.slice(0, 57)}...` : dto.body,
            data: { notes: [dto.body] },
          },
        ],
        edges: [],
      },
      { sourceRunId: null, createdBy: actingUserId },
    );

    const noteNode = nodes[0];
    if (dto.nodeId && noteNode) {
      await this.edgesRepository.upsertMany(projectId, [
        { sourceId: noteNode.id, targetId: dto.nodeId, type: "relationship", sourceRunId: null },
      ]);
    }

    return note;
  }
}
